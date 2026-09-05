/**
 * Server-side AI analysis of the student's uploaded syllabus + PYQ text.
 *
 * The AI key never reaches the browser: it is read inside the handler and the
 * gateway call happens on the server.
 *
 * Two calls exist on purpose:
 *  - analyzeUploads: fast, short ranking + schedule for the plan screen.
 *  - getTopicDetail: the long study material, generated only when a topic is opened.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { DEPTH_NOTE, timeProfileFor } from "./time-profile";

const inputSchema = z.object({
  syllabusText: z.string().min(1),
  pyqTexts: z
    .array(z.object({ name: z.string(), text: z.string().min(1) }))
    .min(1),
  totalMinutes: z.number().int().positive(),
  goal: z.enum(["just_pass", "score_well", "full_prep"]),
  goalLabel: z.string(),
  timeLabel: z.string(),
});

export const aiTopicSchema = z.object({
  name: z.string(),
  unit: z.string(),
  appearedIn: z.number(),
  totalPapers: z.number(),
  marksNote: z.string(),
  questionType: z.enum(["long answer", "short answer", "numerical"]),
  estimatedMinutes: z.number(),
  priority: z.enum(["very_high", "high", "medium", "low"]),
  reasons: z.array(z.string()),
  whyFirst: z.string(),
  summary: z.string(),
});

export const aiStrategySchema = z.object({
  subject: z.string(),
  totalPapers: z.number(),
  overview: z.string(),
  topics: z.array(aiTopicSchema).min(1),
  schedule: z.array(
    z.object({
      label: z.string(),
      detail: z.string(),
      startMinute: z.number(),
      endMinute: z.number(),
    }),
  ),
});

export type AiStrategy = z.infer<typeof aiStrategySchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "totalPapers", "overview", "topics", "schedule"],
  properties: {
    subject: { type: "string", description: "Subject named in the uploaded syllabus" },
    totalPapers: { type: "number", description: "How many distinct question papers were provided" },
    overview: { type: "string", description: "2 sentences of strategy for the time available" },
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "unit",
          "appearedIn",
          "totalPapers",
          "marksNote",
          "questionType",
          "estimatedMinutes",
          "priority",
          "reasons",
          "whyFirst",
          "summary",
        ],
        properties: {
          name: { type: "string" },
          unit: { type: "string", description: "Syllabus unit/section this topic belongs to" },
          appearedIn: { type: "number", description: "Number of identified papers containing it" },
          totalPapers: { type: "number" },
          marksNote: {
            type: "string",
            description: "Marks/weight seen in the papers, or an empty string if not stated",
          },
          questionType: { type: "string", enum: ["long answer", "short answer", "numerical"] },
          estimatedMinutes: { type: "number" },
          priority: { type: "string", enum: ["very_high", "high", "medium", "low"] },
          reasons: { type: "array", items: { type: "string" } },
          whyFirst: { type: "string" },
          summary: { type: "string", description: "One line, max 20 words" },
        },
      },
    },
    schedule: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "detail", "startMinute", "endMinute"],
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
          startMinute: { type: "number" },
          endMinute: { type: "number" },
        },
      },
    },
  },
} as const;

const detailJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["explanation", "keyConcepts", "practiceQuestion", "answerFramework"],
  properties: {
    explanation: { type: "string", description: "Concise explanation of the topic" },
    keyConcepts: { type: "array", items: { type: "string" } },
    practiceQuestion: {
      type: "string",
      description: "A real question taken from the uploaded papers when present",
    },
    answerFramework: { type: "array", items: { type: "string" } },
  },
} as const;

export const topicDetailSchema = z.object({
  explanation: z.string(),
  keyConcepts: z.array(z.string()),
  practiceQuestion: z.string(),
  answerFramework: z.array(z.string()),
});

export type TopicDetail = z.infer<typeof topicDetailSchema>;

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);

/** Keep the total prompt bounded no matter how many papers were uploaded. */
const PYQ_BUDGET = 30000;

async function callGateway(body: unknown): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const raw = await res.text();
    let message = `AI analysis failed (${res.status}).`;
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message ?? parsed.message ?? message;
    } catch {
      /* keep default */
    }
    if (res.status === 402) message = `${message} (AI credits are required.)`;
    throw new Error(message);
  }

  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("The AI returned an empty analysis. Please retry.");
  return content;
}

export const analyzeUploads = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const profile = timeProfileFor(data.totalMinutes);
    const perPaper = Math.max(2500, Math.floor(PYQ_BUDGET / data.pyqTexts.length));

    const papers = data.pyqTexts
      .map((doc, i) => `--- PAPER ${i + 1}: ${doc.name} ---\n${clip(doc.text, perPaper)}`)
      .join("\n\n");

    const prompt = [
      `SYLLABUS:\n${clip(data.syllabusText, 12000)}`,
      `\nPREVIOUS-YEAR PAPERS (${data.pyqTexts.length} files uploaded):\n${papers}`,
      `\nSTUDENT: ${data.totalMinutes} minutes available (${data.timeLabel}). Goal: ${data.goalLabel}.`,
      `\nTIME PROFILE — "${profile.label}" (${profile.band}):`,
      `- Plan for ${profile.minTopics}-${profile.maxTopics} topics to study, and return exactly ${profile.requestedTopics} topics in total, ranked best-first (the extras become "study later").`,
      `- Coverage rule: ${profile.breadth}`,
      `- Depth: ${profile.depth}. ${DEPTH_NOTE[profile.depth]}`,
      `- Time split: about ${profile.studyMinutes} min learning topics, ${profile.practiceMinutes} min previous-year question practice, ${profile.revisionMinutes} min revision.`,
      `- estimatedMinutes across the top ${profile.maxTopics} topics must sum to roughly ${profile.studyMinutes} minutes (never more).`,
      `\nTASK: Identify the topics that actually appear in these papers and are in this syllabus.`,
      `A single uploaded file may contain several papers (one per year/session). Set totalPapers to the number of distinct question papers you can identify (at least ${data.pyqTexts.length}).`,
      `For every topic, appearedIn MUST be the real count of those papers that contain it, and each topic's totalPapers MUST equal the overall totalPapers.`,
      `Set marksNote only from marks printed in the papers; otherwise use an empty string.`,
      `Rank by PYQ frequency, marks/weight, syllabus relevance, the available time and the goal "${data.goalLabel}".`,
      `Build a schedule covering 0 to ${data.totalMinutes} minutes with no gaps, matching the time split above and ending with practice then revision.`,
      `Keep summary, whyFirst and reasons short — one line each. Do not write long explanations.`,
      `Never invent frequencies, marks or questions that are not in the uploaded text.`,
    ].join("\n");

    const content = await callGateway({
      model: "google/gemini-3.7-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an exam-strategy analyst. You only use facts present in the provided syllabus and question papers. You answer briefly.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "exam_strategy", strict: true, schema: jsonSchema },
      },
    });

    return aiStrategySchema.parse(JSON.parse(content));
  });

const detailInputSchema = z.object({
  topicName: z.string().min(1),
  unit: z.string(),
  questionType: z.string(),
  estimatedMinutes: z.number().int().positive(),
  depth: z.enum(["essentials", "standard", "thorough"]),
  goalLabel: z.string(),
  syllabusText: z.string(),
  pyqText: z.string(),
});

/** Long study material for one topic — generated on demand, keeping the plan fast. */
export const getTopicDetail = createServerFn({ method: "POST" })
  .inputValidator((data) => detailInputSchema.parse(data))
  .handler(async ({ data }) => {
    const words =
      data.depth === "essentials" ? "70-100" : data.depth === "standard" ? "110-150" : "170-220";

    const prompt = [
      `TOPIC: ${data.topicName} (syllabus unit: ${data.unit || "unknown"})`,
      `Usual question type in the papers: ${data.questionType}. Study slot: ${data.estimatedMinutes} minutes. Student goal: ${data.goalLabel}.`,
      data.syllabusText ? `\nSYLLABUS EXCERPT:\n${clip(data.syllabusText, 6000)}` : "",
      data.pyqText ? `\nPREVIOUS-YEAR PAPER EXCERPTS:\n${clip(data.pyqText, 12000)}` : "",
      `\nTASK: Write exam-ready study material for this topic only.`,
      `explanation: ${words} words, ${DEPTH_NOTE[data.depth]}`,
      `keyConcepts: 4-7 short phrases a student must remember.`,
      `practiceQuestion: quote a real question about this topic from the papers above; if none exists, write one in the same style and phrase it plainly.`,
      `answerFramework: 4-6 ordered steps for structuring the answer.`,
      `Never invent syllabus content, marks or citations that are not in the provided text.`,
    ]
      .filter(Boolean)
      .join("\n");

    const content = await callGateway({
      model: "google/gemini-3.7-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an exam tutor. You only use facts present in the provided syllabus and question papers.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "topic_detail", strict: true, schema: detailJsonSchema },
      },
    });

    return topicDetailSchema.parse(JSON.parse(content));
  });
