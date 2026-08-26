import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const { strategy } = useSession();
  const [done, setDone] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, index) => {
      timers.push(setTimeout(() => setDone(index + 1), 420 * (index + 1)));
    });
    timers.push(setTimeout(() => navigate({ to: "/plan" }), 420 * STEPS.length + 700));
    return () => timers.forEach(clearTimeout);
  }, [navigate]);

  return (
    <Screen className="justify-center">
      <div className="mb-10">
        <p className="label-mono text-ember mb-3 font-bold">{strategy.subject}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Analyzing your exam...</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cross-referencing your syllabus with 7 years of question papers.
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
