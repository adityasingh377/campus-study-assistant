import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { BackLink, BottomNav, Screen } from "@/components/app-chrome";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/study/$topicId")({
  component: StudyScreen,
});

function StudyScreen() {
  const { topicId } = Route.useParams();
  const { strategy } = useSession();
  const [step, setStep] = useState(1);
  const [showFramework, setShowFramework] = useState(false);

  const ranked = [...strategy.studyFirst, ...strategy.studyLater].find(
    (item) => item.topic.id === topicId,
  );
  if (!ranked) return null;
  const { topic } = ranked;

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
            <p className="text-base leading-relaxed text-pretty">{topic.explanation}</p>
          </section>

          <section>
            <h2 className="label-mono text-ember mb-3 font-bold">Key concepts</h2>
            <ul className="flex flex-wrap gap-2">
              {topic.keyConcepts.map((concept) => (
                <li
                  key={concept}
                  className="border-border bg-card rounded-lg border px-3 py-2 text-xs font-medium"
                >
                  {concept}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-foreground text-background rounded-2xl p-6">
            <h2 className="label-mono mb-3 font-bold opacity-50">Practice</h2>
            <p className="mb-6 font-bold italic">“{topic.practiceQuestion}”</p>

            {showFramework ? (
              <ol className="space-y-3">
                {topic.answerFramework.map((line, index) => (
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
