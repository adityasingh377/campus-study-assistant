import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { BackLink, BottomNav, Screen } from "@/components/app-chrome";
import { PRIORITY_LABEL } from "@/lib/analysis";
import { useSession } from "@/lib/session";
import { TOPICS } from "@/lib/study-data";

export const Route = createFileRoute("/topic/$topicId")({
  loader: ({ params }) => {
    const topic = TOPICS.find((t) => t.id === params.topicId);
    if (!topic) throw notFound();
    return { topicName: topic.name };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Topic unavailable — Campus Study Assistant" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `Why study ${loaderData.topicName}? — Campus Study Assistant`;
    const description = `The evidence behind recommending ${loaderData.topicName}: past-paper frequency, syllabus fit, question type and your exam goal.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: `Why study ${loaderData.topicName}?` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: WhyTopicScreen,
});

function WhyTopicScreen() {
  const { topicId } = Route.useParams();
  const { strategy } = useSession();

  const ranked =
    [...strategy.studyFirst, ...strategy.studyLater].find((item) => item.topic.id === topicId) ??
    null;

  if (!ranked) return null;

  const { topic, priority } = ranked;

  return (
    <>
      <Screen withNav>
        <BackLink to="/plan">Back to strategy</BackLink>

        <header className="mb-8">
          <span className="label-mono bg-ember-soft text-ember mb-3 inline-block rounded-md px-2 py-1 font-bold">
            🔥 {PRIORITY_LABEL[priority]}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">{topic.name}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{topic.summary}</p>
        </header>

        <section className="border-border bg-card shadow-card mb-8 rounded-2xl border p-5">
          <h2 className="label-mono text-muted-foreground mb-4 font-bold">Why we recommend it</h2>
          <ul className="space-y-3">
            {ranked.reasons.map((reason) => (
              <li key={reason} className="flex gap-3 text-sm leading-relaxed">
                <span className="text-ember" aria-hidden>
                  •
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="label-mono text-muted-foreground mb-2 font-bold">Recommended time</h2>
          <p className="text-2xl font-extrabold tracking-tight">{topic.estimatedMinutes} minutes</p>
        </section>

        <section className="mb-10">
          <h2 className="label-mono text-muted-foreground mb-4 font-bold">Study sequence</h2>
          <ol className="border-border divide-border divide-y rounded-2xl border">
            {topic.sequence.map((step, index) => (
              <li key={step.step} className="flex items-center gap-4 px-4 py-3">
                <span className="label-mono text-muted-foreground shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">{step.step}</span>
                <span className="label-mono text-ember shrink-0 font-bold">{step.minutes}m</span>
              </li>
            ))}
          </ol>
        </section>

        <Link
          to="/study/$topicId"
          params={{ topicId: topic.id }}
          className="bg-ember text-ember-foreground shadow-card block w-full rounded-xl p-5 text-center font-bold transition-transform active:scale-95"
        >
          Start Topic →
        </Link>
      </Screen>
      <BottomNav />
    </>
  );
}
