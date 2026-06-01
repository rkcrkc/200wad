"use client";

import type { ProgressPageStats } from "@/lib/queries/stats";
import { SummaryCards } from "@/components/progress/SummaryCards";
import { LearningChart } from "@/components/progress/LearningChart";

interface ProgressClientProps {
  stats: ProgressPageStats;
  isGuest: boolean;
}

export function ProgressClient({ stats }: ProgressClientProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Summary Cards */}
      <SummaryCards progress={stats.cumulative} />

      {/* Row 2: Learning Chart (full width) */}
      <LearningChart data={stats.chartData} />
    </div>
  );
}
