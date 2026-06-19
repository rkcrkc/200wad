"use client";

import { useMemo, type ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import type { HeatmapDay } from "@/lib/queries/stats";
import { useText } from "@/context/TextContext";

export type HeatmapPalette = "green" | "orange";
export type HeatmapTooltipMode = "default" | "words" | "sessions";

interface ActivityHeatmapProps {
  data: HeatmapDay[];
  /**
   * Colour scale for active cells. Defaults to `"green"` so existing
   * /progress callsites stay unchanged.
   */
  palette?: HeatmapPalette;
  /** Section title above the grid. Defaults to "Activity". */
  title?: string;
  /**
   * Custom node rendered in place of the default `title` heading (e.g. an
   * eyebrow + value block). When provided, `title` is ignored.
   */
  titleSlot?: ReactNode;
  /**
   * Tooltip format. `"words"` reads `wordsLearned` / `wordsMastered` from each
   * day; `"sessions"` reads `lessonSessions` / `testSessions`; `"default"`
   * falls back to the legacy single-count translation.
   */
  tooltipMode?: HeatmapTooltipMode;
  /**
   * Optional node rendered to the right of the title (e.g. a view-mode
   * toggle). Wrappers like `StreakActivityHeatmap` use this to mount tabs
   * inside the heatmap card without duplicating the chrome.
   */
  headerRight?: ReactNode;
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

const PALETTE_SCALES: Record<HeatmapPalette, [string, string, string, string]> = {
  green: ["bg-emerald-200", "bg-emerald-300", "bg-emerald-400", "bg-emerald-600"],
  orange: ["bg-orange-200", "bg-orange-300", "bg-orange-400", "bg-orange-600"],
};

/**
 * Frozen-day override colour. Blue (matches primary token #0b6cff at ~25%
 * alpha via Tailwind blue-200) so freeze-bridge events read as visually
 * distinct from real activity regardless of the underlying palette.
 */
const FROZEN_COLOR = "bg-blue-200";

/**
 * Get a 5-level color based on the count relative to the max.
 * Level 0 = no activity, levels 1-4 = increasing intensity. Frozen days
 * always render with the freeze tint regardless of count.
 */
function getColor(
  count: number,
  max: number,
  palette: HeatmapPalette,
  frozen: boolean
): string {
  if (frozen) return FROZEN_COLOR;
  if (count === 0) return "bg-gray-100";
  if (max === 0) return "bg-gray-100";
  const ratio = count / max;
  const scale = PALETTE_SCALES[palette];
  if (ratio <= 0.25) return scale[0];
  if (ratio <= 0.5) return scale[1];
  if (ratio <= 0.75) return scale[2];
  return scale[3];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildTooltipLabel(
  day: HeatmapDay,
  mode: HeatmapTooltipMode,
  tt: (key: string, vars: Record<string, string | number>) => string
): string {
  const date = formatDate(day.date);
  if (day.frozen) return `Streak frozen — ${date}`;

  if (mode === "words") {
    const learned = day.wordsLearned ?? 0;
    const mastered = day.wordsMastered ?? 0;
    return `${date} — ${learned} learned · ${mastered} mastered`;
  }

  if (mode === "sessions") {
    const lessons = day.lessonSessions ?? 0;
    const tests = day.testSessions ?? 0;
    const lessonLabel = lessons === 1 ? "lesson" : "lessons";
    const testLabel = tests === 1 ? "test" : "tests";
    return `${date} — ${lessons} ${lessonLabel} · ${tests} ${testLabel}`;
  }

  return tt("tip_heatmap_day", { count: day.count, date });
}

export function ActivityHeatmap({
  data,
  palette = "green",
  title = "Activity",
  titleSlot,
  tooltipMode = "default",
  headerRight,
}: ActivityHeatmapProps) {
  const { tt } = useText();
  const { weeks, months, max } = useMemo(() => {
    // Group data into weeks (columns). Each week is an array of 7 days (Sun=0..Sat=6).
    const weeksArr: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];
    let maxCount = 0;

    for (const day of data) {
      const d = new Date(day.date + "T00:00:00");
      const dow = d.getDay(); // 0=Sun, 1=Mon, ...

      if (dow === 0 && currentWeek.length > 0) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(day);
      if (day.count > maxCount) maxCount = day.count;
    }

    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    // Generate month labels with positions
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeksArr.length; w++) {
      const firstDay = weeksArr[w][0];
      const d = new Date(firstDay.date + "T00:00:00");
      const month = d.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          label: d.toLocaleDateString("en-US", { month: "short" }),
          col: w,
        });
        lastMonth = month;
      }
    }

    return { weeks: weeksArr, months: monthLabels, max: maxCount };
  }, [data]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        {titleSlot ?? (
          <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        )}
        {headerRight}
      </div>

      <div className="flex">
        {/* Fixed day-of-week column (stays put while the grid scrolls) */}
        <div className="w-8 shrink-0">
          {/* Spacer matching the month-label row height */}
          <div className="mb-1 h-4" />
          <div className="flex flex-col gap-[3px]">
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="flex h-[11px] items-center text-[10px] leading-none text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Scrolling region: month labels + cells only */}
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="mb-1 flex h-4">
            {(() => {
              const elements: React.ReactNode[] = [];
              for (let i = 0; i < months.length; i++) {
                const gap =
                  i === 0
                    ? months[i].col
                    : months[i].col - months[i - 1].col - 1;
                if (gap > 0) {
                  elements.push(
                    <div
                      key={`gap-${i}`}
                      style={{ width: `${gap * 13}px` }}
                    />
                  );
                }
                elements.push(
                  <div
                    key={months[i].label + months[i].col}
                    className="text-[10px] text-muted-foreground"
                    style={{ width: "13px" }}
                  >
                    {months[i].label}
                  </div>
                );
              }
              return elements;
            })()}
          </div>

          {/* Heatmap cells */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[3px]">
                {/* Pad the first week if it doesn't start on Sunday */}
                {wIdx === 0 &&
                  week.length < 7 &&
                  Array.from({ length: 7 - week.length }).map((_, i) => (
                    <div key={`pad-${i}`} className="h-[11px] w-[11px]" />
                  ))}
                {week.map((day) => (
                  <Tooltip
                    key={day.date}
                    portal
                    label={buildTooltipLabel(day, tooltipMode, tt)}
                  >
                    <div
                      className={`h-[11px] w-[11px] rounded-[2px] ${getColor(day.count, max, palette, day.frozen ?? false)}`}
                    />
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend — fixed at the card's bottom-right, outside the scroller */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="text-[10px] text-muted-foreground">Less</span>
        <div className="h-[11px] w-[11px] rounded-[2px] bg-gray-100" />
        <div className={`h-[11px] w-[11px] rounded-[2px] ${PALETTE_SCALES[palette][0]}`} />
        <div className={`h-[11px] w-[11px] rounded-[2px] ${PALETTE_SCALES[palette][1]}`} />
        <div className={`h-[11px] w-[11px] rounded-[2px] ${PALETTE_SCALES[palette][2]}`} />
        <div className={`h-[11px] w-[11px] rounded-[2px] ${PALETTE_SCALES[palette][3]}`} />
        <span className="text-[10px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}
