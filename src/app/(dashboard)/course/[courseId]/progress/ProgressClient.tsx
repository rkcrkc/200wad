"use client";

import type { ProgressPageStats } from "@/lib/queries/stats";
import { WordsPerDayCard } from "@/components/progress/WordsPerDayCard";
import { StreaksCard } from "@/components/progress/StreaksCard";
import { CumulativeProgressCard } from "@/components/progress/CumulativeProgressCard";
import { ActivityHeatmap } from "@/components/progress/ActivityHeatmap";

interface ProgressClientProps {
  stats: ProgressPageStats;
  isGuest: boolean;
}

export function ProgressClient({ stats }: ProgressClientProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Words Per Day + Streaks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WordsPerDayCard rates={stats.wordsPerDayRates} />
        <StreaksCard streaks={stats.streaks} />
      </div>

      {/* Row 2: Cumulative Progress */}
      <CumulativeProgressCard progress={stats.cumulative} />

      {/* Row 3: Activity Heatmap */}
      <ActivityHeatmap data={stats.heatmapData} />
    </div>
  );
}
