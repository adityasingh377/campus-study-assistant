import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { TIME_OPTIONS, type Goal } from "./study-data";
import { analyzeExam, type ExamStrategy } from "./analysis";

export type SessionState = {
  syllabusUploaded: boolean;
  pyqUploaded: boolean;
  timeId: string;
  customMinutes: number;
  goal: Goal;
};

const DEFAULT_STATE: SessionState = {
  syllabusUploaded: false,
  pyqUploaded: false,
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
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(DEFAULT_STATE);

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
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const strategy = useMemo(() => {
    const option = TIME_OPTIONS.find((o) => o.id === state.timeId) ?? TIME_OPTIONS[0];
    const minutes = state.timeId === "custom" ? state.customMinutes : option.minutes;
    const timeLabel = state.timeId === "custom" ? `${minutes} minutes` : option.label;
    return analyzeExam({ goal: state.goal, totalMinutes: minutes, timeLabel });
  }, [state.timeId, state.customMinutes, state.goal]);

  const value = useMemo(() => ({ state, update, reset, strategy }), [state, update, reset, strategy]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
