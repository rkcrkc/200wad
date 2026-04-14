import type { ChartDailyRow } from "@/lib/queries/stats";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type ChartMetric =
  | "dailyLearning"
  | "vocabulary"
  | "performance";

export type ChartInterval = "daily" | "weekly" | "monthly";

export interface DateRangePreset {
  id: string;
  label: string;
  days: number | null;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "6m", label: "6M", days: 183 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "All", days: null },
];

export interface MetricOption {
  id: ChartMetric;
  label: string;
  color: string;
  chartType: "line" | "area";
  unit?: string;
}

export const METRIC_OPTIONS: MetricOption[] = [
  { id: "performance", label: "Course completion", color: "#00c950", chartType: "line" },
  { id: "vocabulary", label: "Vocabulary", color: "#0b6cff", chartType: "area" },
  { id: "dailyLearning", label: "Daily learning", color: "#ff9224", chartType: "line" },
];

export interface ChartPoint {
  date: string;
  label: string;
  value: number;
  value2?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Return "YYYY-MM-DD" for a Date in local time */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" to local Date */
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** ISO week key "YYYY-Www" for grouping */
function weekKey(d: Date): string {
  // Get the Monday of this week
  const day = d.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - mondayOffset);
  return toDateStr(monday);
}

/** Month key "YYYY-MM" for grouping */
function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Format a date label based on interval */
function formatLabel(dateStr: string, interval: ChartInterval): string {
  const d = parseDate(dateStr.slice(0, 10));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  switch (interval) {
    case "daily":
      return `${months[d.getMonth()]} ${d.getDate()}`;
    case "weekly":
      return `${months[d.getMonth()]} ${d.getDate()}`;
    case "monthly":
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
}

// ============================================================================
// SUGGEST INTERVAL
// ============================================================================

export function suggestInterval(rangeId: string): ChartInterval {
  switch (rangeId) {
    case "7d":
    case "30d":
      return "daily";
    case "90d":
    case "6m":
    case "1y":
      return "weekly";
    case "all":
      return "monthly";
    default:
      return "daily";
  }
}

// ============================================================================
// MAIN TRANSFORM
// ============================================================================

export function transformChartData(
  dailyRows: ChartDailyRow[],
  totalCourseWords: number,
  metric: ChartMetric,
  interval: ChartInterval,
  startDate: string | null,
  endDate: string | null
): ChartPoint[] {
  if (dailyRows.length === 0) return [];

  // 1. Filter by date range
  const filtered = dailyRows.filter((row) => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });

  if (filtered.length === 0) return [];

  // 2. Build a complete day-by-day array with gap filling
  const rangeStart = parseDate(startDate || filtered[0].date);
  const rangeEnd = parseDate(endDate || filtered[filtered.length - 1].date);

  // Index the filtered rows by date for fast lookup
  const rowMap = new Map<string, ChartDailyRow>();
  for (const row of filtered) {
    rowMap.set(row.date, row);
  }

  // Find the last known cumulative values before rangeStart (for carry-forward)
  let lastCumulativeVocab = 0;
  let lastCumulativeMastered = 0;
  let lastCumulativeStudyTime = 0;
  for (const row of dailyRows) {
    if (row.date >= (startDate || "")) break;
    lastCumulativeVocab = row.cumulativeVocab;
    lastCumulativeMastered = row.cumulativeMastered;
    lastCumulativeStudyTime = row.cumulativeStudyTimeSeconds;
  }

  const filledDays: ChartDailyRow[] = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const ds = toDateStr(cursor);
    const existing = rowMap.get(ds);
    if (existing) {
      lastCumulativeVocab = existing.cumulativeVocab;
      lastCumulativeMastered = existing.cumulativeMastered;
      lastCumulativeStudyTime = existing.cumulativeStudyTimeSeconds;
      filledDays.push(existing);
    } else {
      filledDays.push({
        date: ds,
        newWordsStarted: 0,
        newlyMastered: 0,
        cumulativeVocab: lastCumulativeVocab,
        cumulativeMastered: lastCumulativeMastered,
        studyTimeSeconds: 0,
        cumulativeStudyTimeSeconds: lastCumulativeStudyTime,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // 3. Aggregate by interval
  interface Bucket {
    key: string;
    newWordsStarted: number;
    newlyMastered: number;
    studyTimeSeconds: number;
    // For cumulatives, take the last value in the bucket
    lastCumulativeVocab: number;
    lastCumulativeMastered: number;
    lastCumulativeStudyTimeSeconds: number;
  }

  const buckets = new Map<string, Bucket>();
  for (const day of filledDays) {
    const d = parseDate(day.date);
    let key: string;
    switch (interval) {
      case "daily":
        key = day.date;
        break;
      case "weekly":
        key = weekKey(d);
        break;
      case "monthly":
        key = monthKey(d);
        break;
    }

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        newWordsStarted: 0,
        newlyMastered: 0,
        studyTimeSeconds: 0,
        lastCumulativeVocab: 0,
        lastCumulativeMastered: 0,
        lastCumulativeStudyTimeSeconds: 0,
      };
      buckets.set(key, bucket);
    }
    bucket.newWordsStarted += day.newWordsStarted;
    bucket.newlyMastered += day.newlyMastered;
    bucket.studyTimeSeconds += day.studyTimeSeconds;
    bucket.lastCumulativeVocab = day.cumulativeVocab;
    bucket.lastCumulativeMastered = day.cumulativeMastered;
    bucket.lastCumulativeStudyTimeSeconds = day.cumulativeStudyTimeSeconds;
  }

  // 4. Convert to sorted array and extract metric
  const sortedBuckets = Array.from(buckets.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );

  return sortedBuckets.map((bucket) => {
    let value: number;
    let value2: number | undefined;
    switch (metric) {
      case "dailyLearning":
        value = bucket.newWordsStarted;
        value2 = bucket.newlyMastered;
        break;
      case "vocabulary":
        value = bucket.lastCumulativeVocab;
        value2 = bucket.lastCumulativeMastered;
        break;
      case "performance": {
        // value = course completion % (left Y-axis)
        value = totalCourseWords > 0
          ? Math.round((bucket.lastCumulativeMastered / totalCourseWords) * 1000) / 10
          : 0;
        // value2 = words per day rate (right Y-axis)
        const hours = bucket.lastCumulativeStudyTimeSeconds / 3600;
        value2 = hours > 0
          ? Math.round((bucket.lastCumulativeVocab / hours) * 8 * 10) / 10
          : 0;
        break;
      }
    }

    // For monthly keys like "2024-03", use the first of the month for label
    const dateForLabel =
      interval === "monthly" ? `${bucket.key}-01` : bucket.key;

    return {
      date: bucket.key,
      label: formatLabel(dateForLabel, interval),
      value,
      value2,
    };
  });
}
