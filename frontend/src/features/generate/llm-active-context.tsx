"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { tr } from "@/lib/i18n/tr";

type LlmActiveContextValue = {
  isActive: boolean;
  register: () => void;
  unregister: () => void;
};

const LlmActiveContext = createContext<LlmActiveContextValue | null>(null);

export function LlmActiveProvider({ children }: { children: ReactNode }) {
  const countRef = useRef(0);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const register = useCallback(() => {
    countRef.current += 1;
    bump();
  }, [bump]);

  const unregister = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    bump();
  }, [bump]);

  const isActive = countRef.current > 0;

  usePreventUnload(isActive);

  const value = useMemo(
    () => ({ isActive, register, unregister }),
    [isActive, register, unregister],
  );

  return (
    <LlmActiveContext.Provider value={value}>{children}</LlmActiveContext.Provider>
  );
}

export function useLlmActive() {
  const ctx = useContext(LlmActiveContext);
  if (!ctx) {
    return { isActive: false };
  }
  return { isActive: ctx.isActive };
}

/** Registers this component as having an in-flight LLM generation/regeneration. */
export function useRegisterLlmActive(active: boolean) {
  const ctx = useContext(LlmActiveContext);
  useEffect(() => {
    if (!ctx || !active) return;
    ctx.register();
    return () => ctx.unregister();
  }, [active, ctx]);
}

function usePreventUnload(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = tr.generate.leaveWhileGenerating;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isActive]);
}
