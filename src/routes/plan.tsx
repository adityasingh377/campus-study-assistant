import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BottomNav, PriorityTag, Screen, TimeChip } from "@/components/app-chrome";
import { PRIORITY_LABEL, formatMinutes, type RankedTopic } from "@/lib/analysis";
import { useSession } from "@/lib/session";
import { PYQ_YEARS } from "@/lib/study-data";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Your exam strategy — Campus Study Assistant" },
      {
        name: "description",
        content:
          "A ranked study plan: what to study first, why it matters, how long it takes, and what to do next.",
      },
      { property: "og:title", content: "Your Exam Strategy" },
      {
        property: "og:description",
        content: "Ranked topics based on previous-year papers, your time left and your exam goal.",
      },
    ],
  }),
  component: PlanScreen,
});

function PlanScreen() {
  const { strategy } = useSession();
  const navigate = useNavigate();
  const first = strategy.studyFirst[0];
  const plannedMinutes = strategy.studyFirst.reduce(
    (total, item) => total + item.topic.estimatedMinutes,
    0,
  );

  return (
    <>
      <Screen withNav>
        <header className="mb-10">
          <p className="label-mono text-ember mb-1 font-bold">{strategy.subject}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <h1 className="text-2xl font-extrabold tracking-tight">Your Exam Strategy</h1>
            <div className="shrink-0 text-right">
              <p className="label-mono text-muted-foreground">Remaining</p>
              <p className="font-bold">{formatMinutes(strategy.totalMinutes)}</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">Goal: {strategy.goalLabel}</p>
        </header>

        <div className="mb-4 flex items-center gap-2">
          <span className="bg-ember size-2 animate-pulse rounded-full" aria-hidden />
          <h2 className="label-mono font-bold">🔥 Study First</h2>
          <span className="label-mono text-muted-foreground ml-auto">
            {formatMinutes(plannedMinutes)} planned
          </span>
        </div>

        <div className="space-y-4">
          {strategy.studyFirst.map((item) => (
            <PriorityCard key={item.topic.id} item={item} />
          ))}
        </div>

        {strategy.studyLater.length > 0 && (
          <section className="mt-10">
            <h2 className="label-mono text-muted-foreground mb-3 font-bold">Study Later</h2>
            <ul className="border-border divide-border divide-y rounded-2xl border">
              {strategy.studyLater.map(({ topic, priority }) => (
                <li key={topic.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{topic.name}</p>
                    <p className="label-mono text-muted-foreground mt-0.5">
                      {topic.appearedIn} of {PYQ_YEARS} papers
                    </p>
                  </div>
                  <span className="label-mono text-muted-foreground shrink-0">
                    {PRIORITY_LABEL[priority]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {first && (
          <div className="mt-10">
            <button
              type="button"
              onClick={() => navigate({ to: "/study/$topicId", params: { topicId: first.topic.id } })}
              className="bg-foreground text-background shadow-card w-full rounded-xl p-5 font-bold tracking-wide transition-transform active:scale-95"
            >
              STUDY NOW →
            </button>
            <p className="label-mono text-muted-foreground mt-3 text-center">
              Starts with {first.topic.name}
            </p>
          </div>
        )}
      </Screen>
      <BottomNav />
    </>
  );
}

function PriorityCard({ item }: { item: RankedTopic }) {
  const { topic, priority } = item;
  return (
    <article className="border-border bg-card shadow-card rounded-2xl border p-5">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold tracking-tight">{topic.name}</h3>
          <PriorityTag priority={priority} label={PRIORITY_LABEL[priority].toUpperCase()} />
        </div>
        <TimeChip>{topic.estimatedMinutes}m</TimeChip>
      </div>

      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        Appeared in{" "}
        <span className="text-foreground font-bold">
          {topic.appearedIn} of {PYQ_YEARS}
        </span>{" "}
        uploaded papers. Estimated time: {topic.estimatedMinutes} min.
      </p>

      <div className="flex gap-2">
        <Link
          to="/topic/$topicId"
          params={{ topicId: topic.id }}
          className="border-border flex-1 rounded-lg border py-2 text-center text-xs font-bold transition-colors active:bg-muted"
        >
          Why this?
        </Link>
        <Link
          to="/study/$topicId"
          params={{ topicId: topic.id }}
          className="bg-foreground text-background flex-1 rounded-lg py-2 text-center text-xs font-bold"
        >
          Study
        </Link>
      </div>
    </article>
  );
}
