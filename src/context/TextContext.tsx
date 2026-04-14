"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { getText as _getText, getTextTemplate as _getTextTemplate } from "@/lib/text";

interface TextContextValue {
  /** Plain text lookup — returns override or default. */
  t: (key: string) => string;
  /** Template text lookup with `{var}` interpolation. */
  tt: (key: string, vars: Record<string, string | number>) => string;
  /** Raw overrides map (used by admin UI). */
  overrides: Record<string, string>;
}

const TextContext = createContext<TextContextValue | undefined>(undefined);

interface TextProviderProps {
  overrides: Record<string, string>;
  children: ReactNode;
}

export function TextProvider({ overrides, children }: TextProviderProps) {
  const t = useCallback(
    (key: string) => _getText(key, overrides),
    [overrides]
  );

  const tt = useCallback(
    (key: string, vars: Record<string, string | number>) =>
      _getTextTemplate(key, vars, overrides),
    [overrides]
  );

  return (
    <TextContext.Provider value={{ t, tt, overrides }}>
      {children}
    </TextContext.Provider>
  );
}

/** No-override fallback used when no TextProvider is present (e.g. auth pages). */
const EMPTY_OVERRIDES: Record<string, string> = {};

const fallback: TextContextValue = {
  t: (key: string) => _getText(key, EMPTY_OVERRIDES),
  tt: (key: string, vars: Record<string, string | number>) =>
    _getTextTemplate(key, vars, EMPTY_OVERRIDES),
  overrides: EMPTY_OVERRIDES,
};

export function useText() {
  const context = useContext(TextContext);
  return context ?? fallback;
}
