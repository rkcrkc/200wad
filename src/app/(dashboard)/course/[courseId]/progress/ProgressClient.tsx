"use client";

import type { ProgressPageStats } from "@/lib/queries/stats";
import { SummaryCards } from "@/components/progress/SummaryCards";
import { LearningChart } from "@/components/progress/LearningChart";
import { ActivityHeatmap } from "@/components/progress/ActivityHeatmap";

interface ProgressClientProps {
  stats: ProgressPageStats;
  isGuest: boolean;
}

export function ProgressClient({ stats }: ProgressClientProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Summary Cards — the only section on mobile (stacked). */}
      <SummaryCards progress={stats.cumulative} />

      {/* Row 2: Learning Chart (full width) — desktop only. */}
      <div className="hidden md:block">
        <LearningChart data={stats.chartData} />
      </div>

      {/* Row 3: Words heatmap — intensity = learned + mastered on the day,
          tooltip surfaces both counts. Desktop only. */}
      <div className="hidden md:block">
        <ActivityHeatmap
          data={stats.heatmapData}
          title="Words"
          tooltipMode="words"
        />
      </div>
    </div>
  );
}
