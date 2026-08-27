import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { TIME_OPTIONS, type Goal } from "./study-data";
import { analyzeExam, type ExamStrategy } from "./analysis";

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
    },
    [update],
  );

  const addPyqFiles = useCallback(
    (files: File[]) => {
      setPyqFilesState((prev) => {
        const next = [...prev, ...files.filter((f) => !prev.some((p) => p.name === f.name))];
        update({ pyqMetas: next.map(toMeta) });
        return next;
      });
    },
    [update],
  );

  const removePyqFile = useCallback(
    (index: number) => {
      setPyqFilesState((prev) => {
        const next = prev.filter((_, i) => i !== index);
        update({ pyqMetas: next.map(toMeta) });
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
    ],
  );


  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
