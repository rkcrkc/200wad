"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/** Called when a guarded exit is confirmed-or-requested; receives the URL the
 *  user is trying to navigate to so the handler can resume it after warning. */
type ExitHandler = (destination: string) => void;

interface StudyExitGuardValue {
  /** Study/test clients register how a guarded exit should be handled — i.e.
   *  show their "Exit lesson?/Exit test?" confirmation dialog. Pass null to
   *  unregister on unmount. */
  registerExitHandler: (handler: ExitHandler | null) => void;
  /** Request to leave study/test mode for `destination`. Returns true when a
   *  guard intercepted the navigation (the caller must NOT navigate itself —
   *  the guard will navigate once the user confirms). */
  requestExit: (destination: string) => boolean;
}

const StudyExitGuardContext = createContext<StudyExitGuardValue | null>(null);

/**
 * Provides a guard that intercepts attempts to leave study/test mode so that
 * the exit-confirmation dialog is always shown first. Mounted above the word
 * preview sidebar so its locked-word "Upgrade to view" CTA can route through
 * the warning instead of navigating away silently.
 */
export function StudyExitGuardProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<ExitHandler | null>(null);

  const registerExitHandler = useCallback((handler: ExitHandler | null) => {
    handlerRef.current = handler;
  }, []);

  const requestExit = useCallback((destination: string) => {
    if (handlerRef.current) {
      handlerRef.current(destination);
      return true;
    }
    return false;
  }, []);

  const value = useMemo(
    () => ({ registerExitHandler, requestExit }),
    [registerExitHandler, requestExit]
  );

  return (
    <StudyExitGuardContext.Provider value={value}>
      {children}
    </StudyExitGuardContext.Provider>
  );
}

/** Returns the study/test exit guard if a provider is mounted, else null. */
export function useStudyExitGuard(): StudyExitGuardValue | null {
  return useContext(StudyExitGuardContext);
}
