import { ActivityHeatmap } from "@/components/progress/ActivityHeatmap";
import type { HeatmapDay } from "@/lib/queries/stats";

interface StreakActivityHeatmapProps {
  days: HeatmapDay[];
}

/**
 * Thin wrapper that renders the shared `ActivityHeatmap` with the
 * streak-tinted orange palette and the page-appropriate title. Frozen days
 * (set on `HeatmapDay.frozen`) are highlighted blue by the underlying
 * component regardless of palette.
 */
export function StreakActivityHeatmap({ days }: StreakActivityHeatmapProps) {
  return <ActivityHeatmap data={days} palette="orange" title="Activity" />;
}
