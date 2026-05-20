"use client";

import {
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import type { HeaderStats } from "@/components/DashboardContent";

/**
 * Layout-streamed header data. Populated asynchronously by the dashboard
 * layout's slow query bundle (course progress, learning stats, due tests,
 * leaderboard rank). Stays `undefined` until the bundle resolves, which lets
 * the rest of the shell (children, providers) render immediately while the
 * Header/Sidebar gracefully show their unpopulated states.
 */
export interface HeaderStatsBundle {
  stats: HeaderStats;
  dueTestsCount: number;
}

interface HeaderStatsContextValue {
  stats: HeaderStats | undefined;
  dueTestsCount: number | undefined;
}

const HeaderStatsContext = createContext<HeaderStatsContextValue>({
  stats: undefined,
  dueTestsCount: undefined,
});

const HeaderStatsSetterContext = createContext<
  ((bundle: HeaderStatsBundle) => void) | null
>(null);

/**
 * Provides the streamed-stats context. The `bridge` slot is rendered inside an
 * internal Suspense boundary so the rest of the dashboard tree (providers,
 * children) does not block on the slow stats bundle resolving.
 */
export function HeaderStatsProvider({
  promise,
  children,
}: {
  promise: Promise<HeaderStatsBundle> | null;
  children: ReactNode;
}) {
  const [bundle, setBundle] = useState<HeaderStatsContextValue>({
    stats: undefined,
    dueTestsCount: undefined,
  });

  // Stable setter reference: without useCallback this closure was a new
  // function on every render, which flipped the context value, which made
  // HeaderStatsBridge's useEffect [data, setBundle] dep array re-fire and
  // re-call setBundle — an infinite render loop ("Maximum update depth
  // exceeded") that starved every dashboard page on the main thread.
  // Also short-circuit when the incoming bundle matches current state so a
  // settled promise can't churn state by reference.
  const setter = useCallback((b: HeaderStatsBundle) => {
    setBundle((prev) =>
      prev.stats === b.stats && prev.dueTestsCount === b.dueTestsCount
        ? prev
        : { stats: b.stats, dueTestsCount: b.dueTestsCount }
    );
  }, []);

  return (
    <HeaderStatsContext.Provider value={bundle}>
      <HeaderStatsSetterContext.Provider value={setter}>
        {/* The bridge suspends on the promise without blocking the rest of
         * the tree. Fallback is null because Header/Sidebar themselves are
         * already rendered (with their undefined-stats skeleton state). */}
        {promise && (
          <Suspense fallback={null}>
            <HeaderStatsBridge promise={promise} />
          </Suspense>
        )}
        {children}
      </HeaderStatsSetterContext.Provider>
    </HeaderStatsContext.Provider>
  );
}

function HeaderStatsBridge({
  promise,
}: {
  promise: Promise<HeaderStatsBundle>;
}) {
  // `use(promise)` suspends this component only — siblings keep rendering.
  const data = use(promise);
  const setBundle = useContext(HeaderStatsSetterContext);

  useEffect(() => {
    setBundle?.(data);
  }, [data, setBundle]);

  return null;
}

/** Read the streamed header stats. Returns undefined until the promise resolves. */
export function useHeaderStats(): HeaderStatsContextValue {
  return useContext(HeaderStatsContext);
}
