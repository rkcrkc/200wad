import { StatusType } from "@/components/ui/status-pill";

/**
 * Format a number with comma separators (e.g., 1000 → "1,000").
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Format a percentage value for display.
 *
 * @param value - Raw ratio (e.g., 0.42) OR percentage (e.g., 42) depending on `ratio`
 * @param options - Formatting options
 * @param options.decimals - Number of decimal places (default 0). Use 0 for
 *   summary chips/pills and 1 for detailed popovers / stat breakdowns.
 * @param options.ratio - When true, `value` is a 0..1 ratio and will be
 *   multiplied by 100. When false (default), `value` is already a percentage.
 * @returns Formatted percentage string including the `%` suffix (e.g., "42%").
 *
 * Examples:
 *   formatPercent(42)                        // "42%"
 *   formatPercent(42.678, { decimals: 1 })   // "42.7%"
 *   formatPercent(0.42, { ratio: true })     // "42%"
 */
export function formatPercent(
  value: number,
  options?: { decimals?: 0 | 1; ratio?: boolean }
): string {
  const decimals = options?.decimals ?? 0;
  const pct = options?.ratio ? value * 100 : value;
  if (!Number.isFinite(pct)) return "0%";
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Safely compute a percentage from a numerator/denominator pair.
 * Returns 0 when the denominator is 0 (avoids NaN).
 *
 * @param numerator - Part value
 * @param denominator - Whole value
 * @param options - Forwarded to `formatPercent`
 */
export function formatRatioPercent(
  numerator: number,
  denominator: number,
  options?: { decimals?: 0 | 1 }
): string {
  if (!denominator || denominator <= 0) {
    return formatPercent(0, options);
  }
  return formatPercent((numerator / denominator) * 100, options);
}

/**
 * Format a duration in seconds using one of three canonical styles.
 *
 * Single source of truth for displaying elapsed/accumulated time.
 *
 * Styles:
 *   - `"compact"` (default): "2h 30m" when hours > 0, else "30m".
 *       Pass `alwaysShowHours: true` to force the "Xh Ym" form even when
 *       hours is 0 (useful for aligned stat tables).
 *   - `"timer"`: "MM:SS" zero-padded (e.g., "02:30"). Used for live timers
 *       in study/test modes.
 *   - `"hours"`: "2.5 hours" with one decimal place. Renders "0 hours"
 *       for anything under 0.1h so rate popovers don't flash "0.0 hours".
 *
 * @param seconds - Total seconds to format. Non-finite or negative values
 *   are coerced to 0.
 * @param options - Formatting options
 * @param options.style - Which output style to use (default `"compact"`)
 * @param options.alwaysShowHours - Compact style only; force `Xh Ym` form
 */
export function formatDuration(
  seconds: number,
  options?: {
    style?: "compact" | "timer" | "hours";
    alwaysShowHours?: boolean;
  }
): string {
  const style = options?.style ?? "compact";
  const safeSeconds = Number.isFinite(seconds) && seconds > 0
    ? Math.floor(seconds)
    : 0;

  if (style === "timer") {
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  if (style === "hours") {
    const hours = safeSeconds / 3600;
    return hours < 0.1 ? "0 hours" : `${hours.toFixed(1)} hours`;
  }

  // compact
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (options?.alwaysShowHours || hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Map database status string to StatusPill status type.
 * Works for both lesson and word statuses.
 * @param status - Database status string
 * @returns StatusType for StatusPill component
 */
export function mapStatus(status: string, isLocked?: boolean): StatusType {
  if (isLocked) return "locked";
  switch (status) {
    case "mastered":
      return "mastered";
    case "learned":
      return "learned";
    case "learning":
      return "learning";
    default:
      return "notStarted";
  }
}

/**
 * Calculate progress percentage safely.
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @returns Percentage (0-100), returns 0 if total is 0
 */
export function calculateProgressPercent(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Format an ISO timestamp as a short relative-time string.
 *
 * Examples: "now", "5m ago", "3h ago", "2d ago", "1w ago", "Mar 12".
 * Falls back to a localized date for anything older than ~30 days.
 */
export function formatRelativeTime(input: string | Date | null | undefined): string {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (diffSec < 45) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
