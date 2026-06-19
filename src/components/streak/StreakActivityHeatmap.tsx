"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Snowflake,
} from "lucide-react";
import { ActivityHeatmap } from "@/components/progress/ActivityHeatmap";
import { Tabs, type Tab } from "@/components/ui/tabs";
import type { HeatmapDay } from "@/lib/queries/stats";
import { cn } from "@/lib/utils";

interface StreakActivityHeatmapProps {
  days: HeatmapDay[];
  currentStreak: number;
}

type ViewMode = "list" | "heatmap";

const VIEW_TABS: Tab[] = [
  { id: "list", label: "List" },
  { id: "heatmap", label: "Heatmap" },
];

// Day card (w-20 = 80px) + gap-3 (12px) — scroll roughly one card per click.
const SCROLL_STEP = 92;

/**
 * Card for the /streak page that toggles between a horizontally-scrolling
 * list of day cards (default) and the orange heatmap. List cards are ordered
 * earliest -> latest, left to right; today is scrolled into view on mount.
 * List cards share a neutral fill; active days are signalled by an orange-
 * filled flame icon plus the session count + lesson/test breakdown beneath,
 * while frozen-bridge days use a blue fill and snowflake.
 */
export function StreakActivityHeatmap({
  days,
  currentStreak,
}: StreakActivityHeatmapProps) {
  const [view, setView] = useState<ViewMode>("list");

  const toggle = (
    <Tabs
      tabs={VIEW_TABS}
      activeTab={view}
      onChange={(id) => setView(id as ViewMode)}
    />
  );

  // Eyebrow + value heading reused across both views, matching the styling
  // of the streak header stat cards.
  const heading = (
    <div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Flame className="h-4 w-4 text-orange-500" strokeWidth={1.67} />
        <span className="text-xs-medium uppercase tracking-wide">
          Current streak
        </span>
      </div>
      <p className="mt-1 text-xl-semibold text-foreground">
        {currentStreak} {currentStreak === 1 ? "day" : "days"}
      </p>
    </div>
  );

  if (view === "heatmap") {
    return (
      <ActivityHeatmap
        data={days}
        palette="orange"
        titleSlot={heading}
        tooltipMode="sessions"
        headerRight={toggle}
      />
    );
  }

  return <ListView days={days} heading={heading} toggle={toggle} />;
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

/** YYYY-MM-DD in local time, matching the date-only strings from the query. */
function formatLocalDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ListView({
  days,
  heading,
  toggle,
}: {
  days: HeatmapDay[];
  heading: React.ReactNode;
  toggle: React.ReactNode;
}) {
  const todayStr = useMemo(() => formatLocalDateOnly(new Date()), []);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Jump to the right end (today) before paint so the user lands on the most
  // recent day without a visible scroll.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [days.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [days.length]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        {heading}
        {toggle}
      </div>

      <div className="relative -mx-6">
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {days.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              isToday={day.date === todayStr}
            />
          ))}
          {/* Disabled placeholders for the next 3 days so today doesn't sit
              awkwardly flush against the right edge. */}
          {Array.from({ length: 3 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            return <FutureDayCard key={`future-${i}`} date={d} />;
          })}
        </div>

        {/* Fade-out gradients at the ends */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white from-40% to-transparent transition-opacity",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white from-40% to-transparent transition-opacity",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Scroll buttons — vertically centered on the colored card */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-SCROLL_STEP)}
            aria-label="Scroll left"
            className="absolute left-1 top-9 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all hover:text-primary hover:shadow-[0_6px_20px_rgba(0,0,0,0.28)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy(SCROLL_STEP)}
            aria-label="Scroll right"
            className="absolute right-1 top-9 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all hover:text-primary hover:shadow-[0_6px_20px_rgba(0,0,0,0.28)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function DayCard({
  day,
  isToday,
}: {
  day: HeatmapDay;
  isToday: boolean;
}) {
  const lessons = day.lessonSessions ?? 0;
  const tests = day.testSessions ?? 0;
  const total = lessons + tests;
  const isFrozen = !!day.frozen;

  const d = new Date(day.date + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const topLabel = isToday ? "TODAY" : weekday;
  let iconClass = "text-gray-300";
  if (isFrozen) iconClass = "text-blue-500";
  else if (total > 0) iconClass = "fill-orange-500 text-orange-500";

  return (
    <div className="flex w-20 shrink-0 flex-col items-center">
      <div
        className={cn(
          "flex w-full flex-col items-center gap-1 rounded-xl px-2 py-3",
          isFrozen ? "bg-blue-200" : "bg-background",
          isToday && "border-[1.5px] border-primary"
        )}
      >
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {topLabel}
        </span>
        <span className="text-small-semibold text-foreground">{monthDay}</span>
        {isFrozen ? (
          <Snowflake className={`mt-1 h-5 w-5 ${iconClass}`} strokeWidth={1.67} />
        ) : (
          <Flame className={`mt-1 h-5 w-5 ${iconClass}`} strokeWidth={1.67} />
        )}
      </div>

      <div className="mt-2 flex w-full flex-col items-center text-center">
        {isFrozen ? (
          <>
            <span className="text-xs-medium text-blue-500">Frozen</span>
            <span className="text-[11px] text-muted-foreground">
              Streak bridged
            </span>
          </>
        ) : total > 0 ? (
          <>
            <span className="text-xs-medium text-foreground">
              {total} {total === 1 ? "session" : "sessions"}
            </span>
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <BookOpen className="h-3 w-3" strokeWidth={1.67} />
                {lessons}
              </span>
              <span className="flex items-center gap-0.5">
                <ClipboardCheck className="h-3 w-3" strokeWidth={1.67} />
                {tests}
              </span>
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Greyed-out placeholder for an upcoming day. Purely visual padding so the
 * "today" card isn't pinned to the right edge of the scroller.
 */
function FutureDayCard({ date }: { date: Date }) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex w-20 shrink-0 flex-col items-center opacity-40">
      <div className="flex w-full flex-col items-center gap-1 rounded-xl bg-background px-2 py-3">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {weekday}
        </span>
        <span className="text-small-semibold text-foreground">{monthDay}</span>
        <Flame className="mt-1 h-5 w-5 text-gray-300" strokeWidth={1.67} />
      </div>
    </div>
  );
}
