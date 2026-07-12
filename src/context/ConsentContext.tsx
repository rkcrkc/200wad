"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Non-essential cookie categories the user can consent to. Strictly-necessary
 * cookies (auth/session) are always on and are not represented here. `analytics`
 * gates PostHog today; `marketing` is reserved for any future ad/marketing tags
 * (e.g. Google/Facebook) so they can be gated without reworking this store.
 */
export type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
};

type StoredConsent = ConsentCategories & {
  version: number;
  updatedAt: string;
};

const STORAGE_KEY = "cookie-consent";
/** Bump when the categories change so stale choices re-prompt. */
const CONSENT_VERSION = 1;

const DENY_ALL: ConsentCategories = { analytics: false, marketing: false };
const ALLOW_ALL: ConsentCategories = { analytics: true, marketing: true };

/** Resolved consent, including whether an explicit choice has been made. */
type ConsentState = ConsentCategories & { decided: boolean };
const UNDECIDED: ConsentState = { analytics: false, marketing: false, decided: false };

// ---------------------------------------------------------------------------
// localStorage-backed external store. Using useSyncExternalStore (rather than
// reading storage inside an effect) keeps SSR/hydration consistent, avoids
// setState-in-effect, and gives cross-tab sync via the `storage` event. The
// snapshot is cached so getSnapshot returns a stable reference between reads.
// ---------------------------------------------------------------------------
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedState: ConsentState = UNDECIDED;

function computeState(): ConsentState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredConsent>;
      cachedState =
        parsed && parsed.version === CONSENT_VERSION
          ? {
              analytics: Boolean(parsed.analytics),
              marketing: Boolean(parsed.marketing),
              decided: true,
            }
          : UNDECIDED;
    } catch {
      cachedState = UNDECIDED;
    }
  } else {
    cachedState = UNDECIDED;
  }
  return cachedState;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback); // cross-tab sync
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): ConsentState {
  return computeState();
}

/** Server render (and initial hydration) always treats consent as undecided. */
function getServerSnapshot(): ConsentState {
  return UNDECIDED;
}

function writeConsent(choice: ConsentCategories) {
  const record: StoredConsent = {
    ...choice,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(record);
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore write failures (private mode / blocked storage).
  }
  cachedRaw = serialized;
  cachedState = { analytics: choice.analytics, marketing: choice.marketing, decided: true };
  listeners.forEach((l) => l());
}

type ConsentContextValue = {
  /** Current consent state. Defaults to all-false until an explicit choice. */
  consent: ConsentCategories;
  /** True once the user has made an explicit accept/reject choice. */
  hasDecided: boolean;
  /** Whether the banner/settings card should be visible. */
  showBanner: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  /** Persist a specific set of category choices. */
  save: (choice: ConsentCategories) => void;
  /** Re-open the consent card so a user can change their mind. */
  openSettings: () => void;
  /** Close the card without recording a choice (consent unchanged). */
  close: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [manuallyOpen, setManuallyOpen] = useState(false);

  const save = useCallback((choice: ConsentCategories) => {
    writeConsent(choice);
    setManuallyOpen(false);
  }, []);
  const acceptAll = useCallback(() => save(ALLOW_ALL), [save]);
  const rejectAll = useCallback(() => save(DENY_ALL), [save]);
  const openSettings = useCallback(() => setManuallyOpen(true), []);
  const close = useCallback(() => setManuallyOpen(false), []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent: { analytics: state.analytics, marketing: state.marketing },
      hasDecided: state.decided,
      showBanner: !state.decided || manuallyOpen,
      acceptAll,
      rejectAll,
      save,
      openSettings,
      close,
    }),
    [state, manuallyOpen, acceptAll, rejectAll, save, openSettings, close],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return ctx;
}
