import { createFileRoute, Link } from "@tanstack/react-router";

import { Screen } from "@/components/app-chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Study Assistant — Study the right things first" },
      {
        name: "description",
        content:
          "Upload your syllabus and previous-year questions to find out which topics to study first before your exam.",
      },
      { property: "og:title", content: "Campus Study Assistant" },
      {
        property: "og:description",
        content: "Your syllabus is big. Your time isn't. Know what to study first.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <Screen>
      <div className="mb-12 pt-12">
        <span className="label-mono bg-ember text-ember-foreground mb-6 inline-block px-2 py-1 font-bold">
          Exam mode
        </span>
        <h1 className="mb-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-balance">
          Your syllabus is big.
          <br />
          Your time isn&apos;t.
        </h1>
        <p className="text-muted-foreground max-w-[30ch] text-lg text-pretty">
          Upload your syllabus and previous-year questions. We&apos;ll help you figure out what to
          study first.
        </p>
      </div>

      <div className="mt-auto space-y-4">
        <Link
          to="/upload"
          className="bg-foreground text-background flex w-full items-center justify-between rounded-xl p-5 font-bold transition-transform active:scale-95"
        >
          <span>Start Preparing</span>
          <span className="font-mono text-sm opacity-50">01/04</span>
        </Link>
        <p className="label-mono text-muted-foreground text-center">
          Built for last-minute exam preparation
        </p>
      </div>
    </Screen>
  );
}
