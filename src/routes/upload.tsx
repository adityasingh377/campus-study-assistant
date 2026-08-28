import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, FileText, Plus, X } from "lucide-react";
import { useRef } from "react";

import { BackLink, Screen, StepLabel } from "@/components/app-chrome";
import { useSession } from "@/lib/session";
import { SUBJECT, SYLLABUS_UNITS } from "@/lib/study-data";

const ACCEPT = "application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg";

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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadScreen() {
  const {
    state,
    syllabusFile,
    pyqFiles,
    setSyllabusFile,
    addPyqFiles,
    removePyqFile,
    syllabusStatus,
    syllabusError,
    pyqStatus,
    pyqError,
    pyqTexts,
  } = useSession();
  const navigate = useNavigate();
  const syllabusInput = useRef<HTMLInputElement>(null);
  const pyqInput = useRef<HTMLInputElement>(null);

  const syllabusMeta = state.syllabusMeta;
  const pyqMetas = state.pyqMetas;
  const canContinue = Boolean(syllabusFile) && pyqFiles.length > 0;

  return (
    <Screen>
      <BackLink to="/">Home</BackLink>

      <header className="mb-10">
        <StepLabel>Step 02 / 04</StepLabel>
        <h1 className="mt-2 mb-2 text-2xl font-bold tracking-tight">Let&apos;s understand your exam.</h1>
        <p className="text-muted-foreground text-sm">Upload your syllabus as a PDF or image.</p>
      </header>

      <input
        ref={syllabusInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-label="Select syllabus file"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (file) setSyllabusFile(file);
          event.target.value = "";
        }}
      />
      <input
        ref={pyqInput}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        aria-label="Select previous-year question files"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) addPyqFiles(files);
          event.target.value = "";
        }}
      />

      <div className="space-y-10">
        <section>
          {!syllabusMeta ? (
            <div className="border-border flex flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center">
              <div className="bg-ember-soft mb-4 flex size-12 items-center justify-center rounded-full">
                <FileText className="text-ember size-5" aria-hidden />
              </div>
              <p className="mb-1 font-bold">Drop your syllabus here</p>
              <p className="text-muted-foreground mb-5 text-xs">PDF or image, one file</p>
              <button
                type="button"
                onClick={() => syllabusInput.current?.click()}
                className="bg-foreground text-background rounded-lg px-5 py-3 text-sm font-bold transition-transform active:scale-95"
              >
                Upload Syllabus
              </button>
            </div>
          ) : (
            <div className="border-border bg-card shadow-card rounded-2xl border p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-extrabold tracking-tight">{syllabusMeta.name}</p>
                  <p className="label-mono text-ember mt-1 font-bold">
                    {formatSize(syllabusMeta.size)} · ready
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => syllabusInput.current?.click()}
                    className="label-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    aria-label="Remove syllabus file"
                    onClick={() => setSyllabusFile(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
              {syllabusStatus === "extracting" && (
                <p className="label-mono text-muted-foreground mb-2">Extracting syllabus text…</p>
              )}
              {syllabusStatus === "done" && (
                <p className="label-mono text-ember mb-2">Syllabus text extracted successfully.</p>
              )}
              {syllabusStatus === "error" && (
                <p className="label-mono text-muted-foreground mb-2">
                  {syllabusError ?? "Could not extract syllabus text."}
                </p>
              )}
              <p className="label-mono text-muted-foreground mb-2">{SUBJECT} — expected units</p>
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
          <p className="text-muted-foreground mb-4 text-sm">Recommended: 3–7 years of PYQs</p>

          {pyqMetas.length === 0 ? (
            <div className="border-border flex flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center">
              <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
                <Plus className="text-muted-foreground size-5" aria-hidden />
              </div>
              <p className="text-muted-foreground mb-5 text-xs">
                Question papers from the last few years
              </p>
              <button
                type="button"
                onClick={() => pyqInput.current?.click()}
                className="border-border rounded-lg border px-5 py-3 text-sm font-bold transition-colors active:bg-muted"
              >
                Upload PYQs
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pyqMetas.map((meta, index) => (
                <div
                  key={`${meta.name}-${index}`}
                  className="border-border bg-card shadow-card flex items-center gap-3 rounded-2xl border p-5"
                >
                  <Check className="text-ember size-4 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{meta.name}</p>
                    <p className="label-mono text-muted-foreground mt-1">{formatSize(meta.size)}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${meta.name}`}
                    onClick={() => removePyqFile(index)}
                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
              {pyqStatus === "extracting" && (
                <p className="label-mono text-muted-foreground">Extracting PYQ text…</p>
              )}
              {pyqStatus === "done" && pyqTexts.length > 0 && (
                <p className="label-mono text-ember">PYQ text extracted successfully.</p>
              )}
              {pyqStatus === "error" && (
                <p className="label-mono text-muted-foreground">
                  {pyqError ?? "Could not extract PYQ text."}
                </p>
              )}
              <button
                type="button"
                onClick={() => pyqInput.current?.click()}
                className="border-border text-muted-foreground hover:text-foreground w-full rounded-2xl border-2 border-dashed p-4 text-sm font-bold transition-colors"
              >
                + Add more PYQs
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="mt-12">
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => navigate({ to: "/setup" })}
          className="bg-foreground text-background w-full rounded-xl p-5 font-bold transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-30"
        >
          Continue
        </button>
        {!canContinue && (
          <p className="label-mono text-muted-foreground mt-3 text-center">
            Select a syllabus and at least one PYQ to continue
          </p>
        )}
      </div>
    </Screen>
  );
}
