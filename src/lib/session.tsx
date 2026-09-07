import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { TIME_OPTIONS, type Goal } from "./study-data";
import { analyzeExam, strategyFromAi, type ExamStrategy } from "./analysis";
import { analyzeUploads, type AiStrategy } from "./exam-analysis.functions";
import { extractPdfText, type ExtractedDoc, type ExtractionStatus } from "./pdf-text";

export type FileMeta = { name: string; size: number; type: string };

export type SessionState = {
  /** Metadata for the selected syllabus file (persisted across the flow). */
  syllabusMeta: FileMeta | null;
  /** Metadata for the selected PYQ files. */
  pyqMetas: FileMeta[];
  timeId: string;
  customMinutes: number;
  goal: Goal;
};

const DEFAULT_STATE: SessionState = {
  syllabusMeta: null,
  pyqMetas: [],
  timeId: "3h",
  customMinutes: 240,
  goal: "score_well",
};

const STORAGE_KEY = "csa-session-v1";
const TEXT_STORAGE_KEY = "csa-text-v1";

const GOAL_LABELS: Record<Goal, string> = {
  just_pass: "Just Pass",
  score_well: "Score Well",
  full_prep: "Full Preparation",
};

type SessionContextValue = {
  state: SessionState;
  update: (patch: Partial<SessionState>) => void;
  reset: () => void;
  strategy: ExamStrategy;
  /** Actual File objects, kept in memory only (not serialisable). */
  syllabusFile: File | null;
  pyqFiles: File[];
  setSyllabusFile: (file: File | null) => void;
  addPyqFiles: (files: File[]) => void;
  removePyqFile: (index: number) => void;
  /** Raw text extracted from the syllabus PDF (in-memory only). */
  syllabusText: ExtractedDoc | null;
  syllabusStatus: ExtractionStatus;
  syllabusError: string | null;
  /** Raw text extracted from each PYQ PDF, aligned with pyqFiles order. */
  pyqTexts: ExtractedDoc[];
  pyqStatus: ExtractionStatus;
  pyqError: string | null;
  /** AI analysis of the uploaded documents. */
  analysisStatus: AnalysisStatus;
  analysisError: string | null;
  runAnalysis: () => Promise<void>;
};

export type AnalysisStatus = "idle" | "running" | "done" | "error";


const SessionContext = createContext<SessionContextValue | null>(null);

const toMeta = (file: File): FileMeta => ({
  name: file.name,
  size: file.size,
  type: file.type,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(DEFAULT_STATE);
  const [syllabusFile, setSyllabusFileState] = useState<File | null>(null);
  const [pyqFiles, setPyqFilesState] = useState<File[]>([]);
  const [syllabusText, setSyllabusText] = useState<ExtractedDoc | null>(null);
  const [syllabusStatus, setSyllabusStatus] = useState<ExtractionStatus>("idle");
  const [syllabusError, setSyllabusError] = useState<string | null>(null);
  const [pyqTexts, setPyqTexts] = useState<ExtractedDoc[]>([]);
  const [pyqStatus, setPyqStatus] = useState<ExtractionStatus>("idle");
  const [pyqError, setPyqError] = useState<string | null>(null);
  const [aiStrategy, setAiStrategy] = useState<AiStrategy | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  /** Fingerprint of the uploads + time + goal the cached analysis belongs to. */
  const analysisKey = useRef<string | null>(null);


  // Read persisted state after hydration to keep SSR output stable.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<SessionState>) });
      // Extracted text is persisted too: File objects cannot survive a reload,
      // so without this the analysis step would lose the uploads' contents.
      const rawText = window.sessionStorage.getItem(TEXT_STORAGE_KEY);
      if (rawText) {
        const parsed = JSON.parse(rawText) as {
          syllabusText: ExtractedDoc | null;
          pyqTexts: ExtractedDoc[];
        };
        if (parsed.syllabusText) {
          setSyllabusText(parsed.syllabusText);
          setSyllabusStatus("done");
        }
        if (parsed.pyqTexts?.length) {
          setPyqTexts(parsed.pyqTexts);
          setPyqStatus("done");
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Keep extracted text in sessionStorage so it survives reloads/navigation.
  useEffect(() => {
    try {
      if (!syllabusText && pyqTexts.length === 0) {
        window.sessionStorage.removeItem(TEXT_STORAGE_KEY);
        return;
      }
      window.sessionStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify({ syllabusText, pyqTexts }));
    } catch {
      /* ignore quota errors — in-memory state still works for this session */
    }
  }, [syllabusText, pyqTexts]);


  const update = useCallback((patch: Partial<SessionState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    setSyllabusFileState(null);
    setPyqFilesState([]);
    setSyllabusText(null);
    setSyllabusStatus("idle");
    setSyllabusError(null);
    setPyqTexts([]);
    setPyqStatus("idle");
    setPyqError(null);
    setAiStrategy(null);
    setAnalysisStatus("idle");
    setAnalysisError(null);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setSyllabusFile = useCallback(
    (file: File | null) => {
      setSyllabusFileState(file);
      update({ syllabusMeta: file ? toMeta(file) : null });
      setSyllabusError(null);
      if (!file) {
        setSyllabusText(null);
        setSyllabusStatus("idle");
        return;
      }
      setSyllabusText(null);
      setSyllabusStatus("extracting");
      extractPdfText(file)
        .then((doc) => {
          setSyllabusText(doc);
          setSyllabusStatus("done");
        })
        .catch((err: unknown) => {
          setSyllabusStatus("error");
          setSyllabusError(err instanceof Error ? err.message : "Could not extract text.");
        });
    },
    [update],
  );

  // Side effects (PDF extraction) run outside the state updater so React's
  // double-invoked updaters in dev can never drop or duplicate an extraction.
  const addPyqFiles = useCallback(
    (files: File[]) => {
      const added = files.filter((f) => !pyqFiles.some((p) => p.name === f.name));
      if (added.length === 0) return;
      const next = [...pyqFiles, ...added];
      setPyqFilesState(next);
      update({ pyqMetas: next.map(toMeta) });
      setPyqError(null);
      setPyqStatus("extracting");
      void Promise.all(
        added.map((file) =>
          extractPdfText(file).catch((err: unknown) => {
            setPyqError(err instanceof Error ? err.message : "Could not extract text.");
            return null;
          }),
        ),
      ).then((docs) => {
        const ok = docs.filter((d): d is ExtractedDoc => d !== null);
        setPyqTexts((prevDocs) => [
          ...prevDocs.filter((d) => !ok.some((o) => o.name === d.name)),
          ...ok,
        ]);
        setPyqStatus(ok.length === added.length ? "done" : "error");
      });
    },
    [pyqFiles, update],
  );

  const removePyqFile = useCallback(
    (index: number) => {
      const removed = pyqFiles[index];
      const next = pyqFiles.filter((_, i) => i !== index);
      setPyqFilesState(next);
      update({ pyqMetas: next.map(toMeta) });
      if (removed) setPyqTexts((docs) => docs.filter((d) => d.name !== removed.name));
      if (next.length === 0) {
        setPyqStatus("idle");
        setPyqError(null);
      }
    },
    [pyqFiles, update],
  );


  const timing = useMemo(() => {
    const option = TIME_OPTIONS.find((o) => o.id === state.timeId);
    const minutes = state.timeId === "custom" ? state.customMinutes : (option?.minutes ?? 180);
    const timeLabel = state.timeId === "custom" ? `${minutes} minutes` : (option?.label ?? "3 Hours");
    return { minutes, timeLabel };
  }, [state.timeId, state.customMinutes]);

  // Real AI analysis when it succeeded; the mock strategy is only a fallback.
  const strategy = useMemo(() => {
    if (aiStrategy) {
      return strategyFromAi({
        ai: aiStrategy,
        goal: state.goal,
        totalMinutes: timing.minutes,
        timeLabel: timing.timeLabel,
      });
    }
    return analyzeExam({ goal: state.goal, totalMinutes: timing.minutes, timeLabel: timing.timeLabel });
  }, [aiStrategy, state.goal, timing]);

  const runAnalysis = useCallback(async () => {
    // Cache: the same uploads + time + goal never trigger a second AI call
    // (going back to the plan, or re-entering the flow, is instant).
    const key = [
      state.timeId,
      state.customMinutes,
      state.goal,
      syllabusText?.name ?? syllabusFile?.name ?? "",
      syllabusText?.charCount ?? 0,
      pyqTexts.map((d) => `${d.name}:${d.charCount}`).join("|") ||
        pyqFiles.map((f) => f.name).join("|"),
    ].join("~");
    if (aiStrategy && analysisKey.current === key) {
      setAnalysisStatus("done");
      return;
    }

    setAnalysisStatus("running");
    setAnalysisError(null);
    try {
      // Extraction may still be in flight, or may never have run (e.g. text was
      // dropped). Re-extract on demand from the in-memory File objects so the AI
      // always receives the real uploaded content.
      let syllabus = syllabusText;
      if (!syllabus && syllabusFile) {
        syllabus = await extractPdfText(syllabusFile);
        setSyllabusText(syllabus);
        setSyllabusStatus("done");
      }
      let pyqs = pyqTexts;
      const missing = pyqFiles.filter((f) => !pyqs.some((d) => d.name === f.name));
      if (missing.length) {
        const extracted = await Promise.all(missing.map((file) => extractPdfText(file)));
        pyqs = [...pyqs, ...extracted];
        setPyqTexts(pyqs);
        setPyqStatus("done");
      }

      if (!syllabus) {
        throw new Error(
          "No syllabus text is available. Go back to uploads and re-select your syllabus PDF, then retry.",
        );
      }
      if (pyqs.length === 0) {
        throw new Error(
          "No previous-year paper text is available. Go back to uploads and re-select your PYQ PDFs, then retry.",
        );
      }

      const result = await analyzeUploads({
        data: {
          syllabusText: syllabus.text,
          pyqTexts: pyqs.map((d) => ({ name: d.name, text: d.text })),
          totalMinutes: timing.minutes,
          goal: state.goal,
          goalLabel: GOAL_LABELS[state.goal],
          timeLabel: timing.timeLabel,
        },
      });
      setAiStrategy(result);
      analysisKey.current = key;
      setAnalysisStatus("done");
    } catch (err) {
      setAiStrategy(null);
      analysisKey.current = null;
      setAnalysisStatus("error");
      setAnalysisError(
        err instanceof Error ? err.message : "AI analysis failed. Please try again.",
      );
    }
  }, [
    aiStrategy,
    syllabusText,
    syllabusFile,
    pyqTexts,
    pyqFiles,
    timing,
    state.goal,
    state.timeId,
    state.customMinutes,
  ]);


  const value = useMemo(
    () => ({
      state,
      update,
      reset,
      strategy,
      syllabusFile,
      pyqFiles,
      setSyllabusFile,
      addPyqFiles,
      removePyqFile,
      syllabusText,
      syllabusStatus,
      syllabusError,
      pyqTexts,
      pyqStatus,
      pyqError,
      analysisStatus,
      analysisError,
      runAnalysis,
    }),
    [
      state,
      update,
      reset,
      strategy,
      syllabusFile,
      pyqFiles,
      setSyllabusFile,
      addPyqFiles,
      removePyqFile,
      syllabusText,
      syllabusStatus,
      syllabusError,
      pyqTexts,
      pyqStatus,
      pyqError,
      analysisStatus,
      analysisError,
      runAnalysis,
    ],
  );


  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
