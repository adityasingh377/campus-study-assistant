import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { BackLink, BottomNav, Screen } from "@/components/app-chrome";
import { useSession } from "@/lib/session";
import { askTopicQuestion } from "@/lib/topic-chat.functions";
import { getTopicDetail, type TopicDetail } from "@/lib/exam-analysis.functions";
import { timeProfileFor } from "@/lib/time-profile";
import type { RankedTopic } from "@/lib/analysis";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/study/$topicId")({
  head: () => ({
    meta: [
      { title: "Study session — Campus Study Assistant" },
      {
        name: "description",
        content:
          "A focused session on your top-priority topic: concise explanation, key points, a previous-year question and an answer framework.",
      },
      { property: "og:title", content: "Your focused study session" },
      {
        property: "og:description",
        content: "Explanation, key points, real past questions and an answer framework.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudyScreen,
});

function StudyScreen() {
  const { topicId } = Route.useParams();
  const { strategy, syllabusText, pyqTexts } = useSession();
  const [step, setStep] = useState(1);
  const [showFramework, setShowFramework] = useState(false);
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const ranked = [...strategy.studyFirst, ...strategy.studyLater].find(
    (item) => item.topic.id === topicId,
  );

  const topic = ranked?.topic;
  const needsDetail = !!topic && topic.explanation.trim().length === 0;

  // The plan request stays fast by leaving the long study material out; it is
  // generated the first time a topic is opened.
  useEffect(() => {
    if (!topic || !needsDetail) return;
    let active = true;
    setDetail(null);
    setDetailError(null);
    getTopicDetail({
      data: {
        topicName: topic.name,
        unit: topic.unit,
        questionType: topic.questionType,
        estimatedMinutes: topic.estimatedMinutes,
        depth: timeProfileFor(strategy.totalMinutes).depth,
        goalLabel: strategy.goalLabel,
        syllabusText: syllabusText?.text ?? "",
        pyqText: pyqTexts.map((d) => `--- ${d.name} ---\n${d.text}`).join("\n\n"),
      },
    })
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((err: unknown) => {
        if (active) {
          setDetailError(
            err instanceof Error
              ? err.message
              : "Couldn't load the study material. Please try again.",
          );
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.id, needsDetail]);

  if (!ranked || !topic) return null;

  const content = needsDetail
    ? {
        explanation: detail?.explanation ?? "",
        keyConcepts: detail?.keyConcepts ?? [],
        practiceQuestion: detail?.practiceQuestion ?? "",
        answerFramework: detail?.answerFramework ?? [],
      }
    : {
        explanation: topic.explanation,
        keyConcepts: topic.keyConcepts,
        practiceQuestion: topic.practiceQuestion,
        answerFramework: topic.answerFramework,
      };
  const loadingDetail = needsDetail && !detail && !detailError;

  const totalSteps = 3;
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <>
      <Screen withNav>
        <BackLink to="/plan">Back to strategy</BackLink>

        <header className="mb-10">
          <h1 className="mb-1 text-3xl font-extrabold tracking-tight">{topic.name}</h1>
          <p className="text-muted-foreground mb-4 text-sm">
            {topic.estimatedMinutes}-minute study session
          </p>
          <div className="bg-muted h-1 overflow-hidden rounded-full">
            <div
              className="bg-ember h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="label-mono text-muted-foreground mt-2">
            Step {step} of {totalSteps} · {topic.unit}
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="label-mono text-ember mb-3 font-bold">Understand</h2>
            {loadingDetail ? (
              <p className="text-muted-foreground text-sm">Preparing your study material…</p>
            ) : detailError ? (
              <p className="text-ember text-sm font-medium" role="alert">
                {detailError}
              </p>
            ) : (
              <p className="text-base leading-relaxed text-pretty">{content.explanation}</p>
            )}
          </section>

          {content.keyConcepts.length > 0 && (
            <section>
              <h2 className="label-mono text-ember mb-3 font-bold">Key concepts</h2>
              <ul className="flex flex-wrap gap-2">
                {content.keyConcepts.map((concept) => (
                  <li
                    key={concept}
                    className="border-border bg-card rounded-lg border px-3 py-2 text-xs font-medium"
                  >
                    {concept}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {content.practiceQuestion && (
            <section className="bg-foreground text-background rounded-2xl p-6">
              <h2 className="label-mono mb-3 font-bold opacity-50">Practice</h2>
              <p className="mb-6 font-bold italic">“{content.practiceQuestion}”</p>

              {showFramework ? (
                <ol className="space-y-3">
                  {content.answerFramework.map((line, index) => (
                    <li key={line} className="flex gap-3 text-sm leading-relaxed">
                      <span className="label-mono shrink-0 pt-1 opacity-50">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="opacity-90">{line}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowFramework(true);
                    setStep(2);
                  }}
                  className="w-full rounded-xl border border-current/20 py-4 text-sm font-bold transition-colors active:bg-background/10"
                >
                  Generate Answer Framework
                </button>
              )}
            </section>
          )}


          <TopicChat ranked={ranked} material={content} />
        </div>

        <div className="mt-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep(totalSteps)}
            className={cn(
              "border-border flex-1 rounded-xl border py-4 text-sm font-bold transition-colors active:bg-muted",
              step === totalSteps && "bg-muted",
            )}
          >
            {step === totalSteps ? "Topic done" : "Mark as done"}
          </button>
          <Link
            to="/plan"
            className="bg-foreground text-background flex-1 rounded-xl py-4 text-center text-sm font-bold"
          >
            Next topic →
          </Link>
        </div>
      </Screen>
      <BottomNav />
    </>
  );
}

type ChatMessage = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "Explain in detail",
  "Give me a 15-mark answer",
  "Make it easier",
  "Give examples",
  "Explain in Hindi",
];

function TopicChat({
  ranked,
  material,
}: {
  ranked: RankedTopic;
  material: { explanation: string; keyConcepts: string[]; practiceQuestion: string };
}) {
  const { strategy, syllabusText, pyqTexts } = useSession();
  const { topic } = ranked;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Conversation is per-topic: reset when the student opens a different topic.
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
  }, [topic.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, loading]);

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question) {
      setError("Type a question first — for example “Give me a 15-mark answer”.");
      return;
    }
    if (loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const result = await askTopicQuestion({
        data: {
          topic: {
            name: topic.name,
            unit: topic.unit,
            summary: topic.summary,
            explanation: material.explanation,
            keyConcepts: material.keyConcepts,
            practiceQuestion: material.practiceQuestion,
            estimatedMinutes: topic.estimatedMinutes,
          },
          syllabusText: syllabusText?.text ?? "",
          pyqText: pyqTexts.map((d) => `--- ${d.name} ---\n${d.text}`).join("\n\n"),
          goalLabel: strategy.goalLabel,
          timeLabel: strategy.timeLabel,
          messages: next.slice(-12),
        },
      });
      setMessages([...next, { role: "assistant", content: result.content }]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The tutor is unavailable right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 className="label-mono text-ember mb-3 font-bold">Ask a follow-up</h2>
      {!syllabusText && pyqTexts.length === 0 && (
        <p className="text-muted-foreground mb-3 text-xs">
          Your uploaded documents aren’t loaded in this session, so answers use this topic only.
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={loading}
            onClick={() => void send(prompt)}
            className="border-border bg-card rounded-full border px-3 py-2 text-xs font-medium disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {messages.length > 0 && (
        <div className="mb-3 space-y-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                message.role === "user"
                  ? "bg-muted ml-6 font-medium"
                  : "border-border bg-card border",
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <p className="label-mono text-muted-foreground mb-3">Thinking…</p>
      )}
      {error && (
        <p className="text-ember mb-3 text-xs font-medium" role="alert">
          {error}
        </p>
      )}
      <div ref={endRef} />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this topic…"
          aria-label="Ask about this topic"
          className="border-border bg-card min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-foreground text-background rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
