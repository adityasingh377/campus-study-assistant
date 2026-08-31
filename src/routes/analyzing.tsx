import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

import { Screen } from "@/components/app-chrome";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";

const STEPS = [
  "Reading syllabus",
  "Comparing previous-year questions",
  "Finding repeated patterns",
  "Identifying high-value topics",
  "Building your study plan",
];

export const Route = createFileRoute("/analyzing")({
  head: () => ({
    meta: [
      { title: "Analyzing your exam — Campus Study Assistant" },
      {
        name: "description",
        content: "Comparing your syllabus against previous-year papers to rank what matters most.",
      },
      { property: "og:title", content: "Analyzing your exam" },
      {
        property: "og:description",
        content: "Finding repeated patterns across your uploaded question papers.",
      },
    ],
  }),
  component: AnalyzingScreen,
});

function AnalyzingScreen() {
  const navigate = useNavigate();
  const { analysisStatus, analysisError, runAnalysis } = useSession();
  const [done, setDone] = useState(0);
  const started = useRef(false);

  // Start the real AI analysis once.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runAnalysis();
  }, [runAnalysis]);

  // Progress ticks while the request is in flight.
  useEffect(() => {
    if (analysisStatus === "error") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, index) => {
      timers.push(setTimeout(() => setDone(index + 1), 900 * (index + 1)));
    });
    return () => timers.forEach(clearTimeout);
  }, [analysisStatus]);

  useEffect(() => {
    if (analysisStatus === "done") navigate({ to: "/plan" });
  }, [analysisStatus, navigate]);

  if (analysisStatus === "error") {
    return (
      <Screen className="justify-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Analysis failed</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {analysisError ?? "Something went wrong while analyzing your documents."}
        </p>
        <p className="label-mono text-muted-foreground mt-4">
          Your uploads, time and goal are still saved.
        </p>
        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => {
              setDone(0);
              void runAnalysis();
            }}
            className="bg-ember text-ember-foreground shadow-card w-full rounded-xl p-5 font-bold transition-transform active:scale-95"
          >
            Retry analysis
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/upload" })}
            className="border-border w-full rounded-xl border p-4 text-sm font-bold"
          >
            Back to uploads
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="justify-center">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Analyzing your exam...</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Reading your uploaded syllabus and previous-year papers.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((step, index) => {
          const complete = index < done;
          const active = index === done;
          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-4 transition-opacity",
                complete ? "opacity-100" : active ? "opacity-100" : "opacity-30",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  complete ? "bg-ember border-transparent" : "border-border",
                  active && "animate-pulse",
                )}
                aria-hidden
              >
                {complete && <Check className="text-ember-foreground size-3" />}
              </span>
              <span className="text-sm font-medium">{step}</span>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}
