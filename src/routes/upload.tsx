import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, FileText, Plus } from "lucide-react";

import { BackLink, Screen, StepLabel } from "@/components/app-chrome";
import { useSession } from "@/lib/session";
import { PYQ_FILE, PYQ_YEARS, SUBJECT, SYLLABUS_FILE, SYLLABUS_UNITS } from "@/lib/study-data";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload syllabus and PYQs — Campus Study Assistant" },
      {
        name: "description",
        content: "Add your syllabus and previous-year question papers so we can compare them.",
      },
      { property: "og:title", content: "Upload your syllabus and PYQs" },
      {
        property: "og:description",
        content: "We read your syllabus and compare it against previous-year papers.",
      },
    ],
  }),
  component: UploadScreen,
});

function UploadScreen() {
  const { state, update } = useSession();
  const navigate = useNavigate();

  return (
    <Screen>
      <BackLink to="/">Home</BackLink>

      <header className="mb-10">
        <StepLabel>Step 02 / 04</StepLabel>
        <h1 className="mt-2 mb-2 text-2xl font-bold tracking-tight">Let&apos;s understand your exam.</h1>
        <p className="text-muted-foreground text-sm">Upload your syllabus as a PDF or image.</p>
      </header>

      <div className="space-y-10">
        <section>
          {!state.syllabusUploaded ? (
            <div className="border-border flex flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center">
              <div className="bg-ember-soft mb-4 flex size-12 items-center justify-center rounded-full">
                <FileText className="text-ember size-5" aria-hidden />
              </div>
              <p className="mb-1 font-bold">Drop your syllabus here</p>
              <p className="text-muted-foreground mb-5 text-xs">PDF or image, one file</p>
              <button
                type="button"
                onClick={() => update({ syllabusUploaded: true })}
                className="bg-foreground text-background rounded-lg px-5 py-3 text-sm font-bold transition-transform active:scale-95"
              >
                Upload Syllabus
              </button>
            </div>
          ) : (
            <div className="border-border bg-card shadow-card rounded-2xl border p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-extrabold tracking-tight">{SUBJECT}</p>
                  <p className="label-mono text-ember mt-1 font-bold">4 units detected</p>
                </div>
                <span className="label-mono text-muted-foreground shrink-0 pt-1">
                  {SYLLABUS_FILE.split(".").pop()}
                </span>
              </div>
              <ul className="space-y-2">
                {SYLLABUS_UNITS.map((unit) => (
                  <li key={unit} className="flex items-center gap-3 text-sm">
                    <Check className="text-ember size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{unit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold tracking-tight">Add Previous-Year Questions</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Recommended: {PYQ_YEARS === 7 ? "3–7" : "3–7"} years of PYQs
          </p>

          {!state.pyqUploaded ? (
            <div className="border-border flex flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center">
              <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
                <Plus className="text-muted-foreground size-5" aria-hidden />
              </div>
              <p className="text-muted-foreground mb-5 text-xs">
                Question papers from the last few years
              </p>
              <button
                type="button"
                onClick={() => update({ pyqUploaded: true })}
                className="border-border rounded-lg border px-5 py-3 text-sm font-bold transition-colors active:bg-muted"
              >
                Upload PYQs
              </button>
            </div>
          ) : (
            <div className="border-border bg-card shadow-card flex items-center gap-3 rounded-2xl border p-5">
              <Check className="text-ember size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{PYQ_FILE}</p>
                <p className="label-mono text-muted-foreground mt-1">
                  {PYQ_YEARS} years of papers read
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-12">
        <button
          type="button"
          disabled={!state.syllabusUploaded || !state.pyqUploaded}
          onClick={() => navigate({ to: "/setup" })}
          className="bg-foreground text-background w-full rounded-xl p-5 font-bold transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-30"
        >
          Continue
        </button>
        {(!state.syllabusUploaded || !state.pyqUploaded) && (
          <p className="label-mono text-muted-foreground mt-3 text-center">
            Upload both files to continue
          </p>
        )}
      </div>
    </Screen>
  );
}
