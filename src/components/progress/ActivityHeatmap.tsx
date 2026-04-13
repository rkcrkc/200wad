"use client";

import { useMemo } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import type { HeatmapDay } from "@/lib/queries/stats";

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

/**
 * Get a 5-level color based on the count relative to the max.
 * Level 0 = no activity, levels 1-4 = increasing intensity.
 */
function getColor(count: number, max: number): string {
  if (count === 0) return "bg-gray-100";
  if (max === 0) return "bg-gray-100";
  const ratio = count / max;
  if (ratio <= 0.25) return "bg-emerald-200";
  if (ratio <= 0.5) return "bg-emerald-300";
  if (ratio <= 0.75) return "bg-emerald-400";
  return "bg-emerald-600";
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

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
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
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Activity
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Month labels */}
          <div className="mb-1 flex pl-8">
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

          {/* Grid: day labels + cells */}
          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex w-8 shrink-0 flex-col gap-[3px]">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-[11px] items-center text-[10px] leading-none text-muted-foreground"
                >
                  {label}
                </div>
              ))}
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
                      label={`${day.count} words mastered on ${formatDate(day.date)}`}
                    >
                      <div
                        className={`h-[11px] w-[11px] rounded-[2px] ${getColor(day.count, max)}`}
                      />
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1.5">
            <span className="text-[10px] text-muted-foreground">Less</span>
            <div className="h-[11px] w-[11px] rounded-[2px] bg-gray-100" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-200" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-300" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-400" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-600" />
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
