/**
 * Conversational follow-up chat for a single study topic.
 *
 * Reuses the same Lovable AI Gateway setup as the strategy analysis; the API key
 * is only read inside the handler so it never reaches the browser.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  topic: z.object({
    name: z.string(),
    unit: z.string(),
    summary: z.string(),
    explanation: z.string(),
    keyConcepts: z.array(z.string()),
    practiceQuestion: z.string(),
    estimatedMinutes: z.number(),
  }),
  /** Extracted syllabus text, when available (already trimmed by the caller). */
  syllabusText: z.string().default(""),
  /** Extracted PYQ text, when available. */
  pyqText: z.string().default(""),
  goalLabel: z.string().default(""),
  timeLabel: z.string().default(""),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1)
    .max(24),
});

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);

export const askTopicQuestion = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const context = [
      `TOPIC: ${data.topic.name} (syllabus unit: ${data.topic.unit})`,
      `RECOMMENDED STUDY TIME: ${data.topic.estimatedMinutes} minutes`,
      `CURRENT SHORT ANSWER SHOWN TO THE STUDENT: ${data.topic.summary}\n${data.topic.explanation}`,
      `KEY CONCEPTS: ${data.topic.keyConcepts.join(", ")}`,
      `PRACTICE QUESTION FROM THE UPLOADED PAPERS: ${data.topic.practiceQuestion}`,
      data.goalLabel ? `STUDENT GOAL: ${data.goalLabel}` : "",
      data.timeLabel ? `TIME BEFORE EXAM: ${data.timeLabel}` : "",
      data.syllabusText
        ? `SYLLABUS EXCERPT (uploaded):\n${clip(data.syllabusText, 8000)}`
        : "SYLLABUS EXCERPT: not available.",
      data.pyqText
        ? `PREVIOUS-YEAR PAPERS EXCERPT (uploaded):\n${clip(data.pyqText, 10000)}`
        : "PREVIOUS-YEAR PAPERS EXCERPT: not available.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const system = [
      "You are a college exam tutor helping a student revise one specific topic.",
      "Answer in an exam-ready way: structured, concise wording, headings or numbered points where useful.",
      'When the student asks for a longer or "X-mark" answer, write a full structured answer (definition, explanation, points/steps, example, conclusion) — never just repeat the summary.',
      'When asked to "make it easier", simplify the language; when asked for another language (e.g. Hindi), reply in that language.',
      "Only use the syllabus and question-paper text provided. Never invent question frequencies, marks, syllabus units, years or citations that are not in the provided context. If something is not available, say so plainly.",
      "Keep answers focused on this topic and readable on a phone. Use markdown-free plain text with simple numbered or dashed lists.",
    ].join(" ");

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
          { role: "system", content: system },
          { role: "system", content: `CONTEXT FOR THIS TOPIC:\n${context}` },
          ...data.messages,
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      let message = `The tutor could not answer right now (${res.status}).`;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
        message = parsed.error?.message ?? parsed.message ?? message;
      } catch {
        /* keep default */
      }
      if (res.status === 402) message = `${message} (AI credits are required.)`;
      if (res.status === 429) message = "Too many requests right now. Please wait a moment and retry.";
      throw new Error(message);
    }

    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("The tutor returned an empty answer. Please try asking again.");

    return { content };
  });
