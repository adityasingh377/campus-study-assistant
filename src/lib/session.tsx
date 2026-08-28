import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { TIME_OPTIONS, type Goal } from "./study-data";
import { analyzeExam, type ExamStrategy } from "./analysis";
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
};


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


  // Read persisted state after hydration to keep SSR output stable.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<SessionState>) });
    } catch {
      /* ignore */
    }
  }, []);

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

  const addPyqFiles = useCallback(
    (files: File[]) => {
      setPyqFilesState((prev) => {
        const added = files.filter((f) => !prev.some((p) => p.name === f.name));
        const next = [...prev, ...added];
        update({ pyqMetas: next.map(toMeta) });
        if (added.length) {
          setPyqError(null);
          setPyqStatus("extracting");
          Promise.all(
            added.map((file) =>
              extractPdfText(file).catch((err: unknown) => {
                setPyqError(err instanceof Error ? err.message : "Could not extract text.");
                return null;
              }),
            ),
          ).then((docs) => {
            const ok = docs.filter((d): d is ExtractedDoc => d !== null);
            setPyqTexts((prevDocs) => [...prevDocs, ...ok]);
            setPyqStatus(ok.length === added.length ? "done" : "error");
          });
        }
        return next;
      });
    },
    [update],
  );

  const removePyqFile = useCallback(
    (index: number) => {
      setPyqFilesState((prev) => {
        const removed = prev[index];
        const next = prev.filter((_, i) => i !== index);
        update({ pyqMetas: next.map(toMeta) });
        if (removed) setPyqTexts((docs) => docs.filter((d) => d.name !== removed.name));
        if (next.length === 0) {
          setPyqStatus("idle");
          setPyqError(null);
        }
        return next;
      });
    },
    [update],
  );

  const strategy = useMemo(() => {
    const option = TIME_OPTIONS.find((o) => o.id === state.timeId);
    const minutes = state.timeId === "custom" ? state.customMinutes : (option?.minutes ?? 180);
    const timeLabel = state.timeId === "custom" ? `${minutes} minutes` : (option?.label ?? "3 Hours");
    return analyzeExam({ goal: state.goal, totalMinutes: minutes, timeLabel });
  }, [state.timeId, state.customMinutes, state.goal]);

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
    ],
  );


  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
