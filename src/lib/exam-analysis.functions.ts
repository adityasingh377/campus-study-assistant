/**
 * Server-side AI analysis of the student's uploaded syllabus + PYQ text.
 *
 * The AI key never reaches the browser: it is read inside the handler and the
 * gateway call happens on the server.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  explanation: z.string(),
  keyConcepts: z.array(z.string()),
  practiceQuestion: z.string(),
  answerFramework: z.array(z.string()),
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
    totalPapers: { type: "number", description: "How many PYQ papers were provided" },
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
          "explanation",
          "keyConcepts",
          "practiceQuestion",
          "answerFramework",
        ],
        properties: {
          name: { type: "string" },
          unit: { type: "string", description: "Syllabus unit/section this topic belongs to" },
          appearedIn: { type: "number", description: "Number of uploaded papers containing it" },
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
          summary: { type: "string" },
          explanation: { type: "string", description: "Concise explanation, 80-150 words" },
          keyConcepts: { type: "array", items: { type: "string" } },
          practiceQuestion: {
            type: "string",
            description: "A real question taken from the uploaded papers",
          },
          answerFramework: { type: "array", items: { type: "string" } },
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

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);

export const analyzeUploads = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const papers = data.pyqTexts
      .map((doc, i) => `--- PAPER ${i + 1}: ${doc.name} ---\n${clip(doc.text, 9000)}`)
      .join("\n\n");

    const prompt = [
      `SYLLABUS (${data.syllabusText.length} chars):\n${clip(data.syllabusText, 14000)}`,
      `\nPREVIOUS-YEAR PAPERS (${data.pyqTexts.length} uploaded):\n${papers}`,
      `\nSTUDENT: ${data.totalMinutes} minutes available (${data.timeLabel}). Goal: ${data.goalLabel}.`,
      `\nTASK: Identify the topics that actually appear in these papers and are in this syllabus.`,
      `A single uploaded file may contain several papers (one per year/session). Set totalPapers to the number of distinct question papers you can actually identify in the uploaded text (at least ${data.pyqTexts.length}).`,
      `For every topic, appearedIn MUST be the real count of those identified papers that contain it, and totalPapers on each topic MUST equal the overall totalPapers.`,
      `Set marksNote only from marks printed in the papers; otherwise use an empty string.`,
      `Rank by PYQ frequency, marks/weight, syllabus relevance, the ${data.totalMinutes} minutes available and the goal "${data.goalLabel}".`,
      `Return 5-9 topics. estimatedMinutes across the top-priority topics must fit the available time.`,
      `Build a schedule that covers 0 to ${data.totalMinutes} minutes with no gaps, ending with PYQ practice and rapid revision.`,
      `Never invent frequencies, marks or questions that are not in the uploaded text.`,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an exam-strategy analyst. You only use facts present in the provided syllabus and question papers.",
          },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "exam_strategy", strict: true, schema: jsonSchema },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      let message = `AI analysis failed (${res.status}).`;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
        message = parsed.error?.message ?? parsed.message ?? message;
      } catch {
        /* keep default */
      }
      if (res.status === 402) message = `${message} (AI credits are required.)`;
      throw new Error(message);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("The AI returned an empty analysis. Please retry.");

    return aiStrategySchema.parse(JSON.parse(content));
  });
