import { StatusType } from "@/components/ui/status-pill";

/**
 * Format seconds into a human-readable time string.
 * @param seconds - Total seconds to format
 * @param options - Formatting options
 * @returns Formatted time string (e.g., "2h 30m" or "30m")
 */
export function formatTime(
  seconds: number,
  options?: { alwaysShowHours?: boolean }
): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (options?.alwaysShowHours || hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format seconds into MM:SS format for timers.
 * @param seconds - Total seconds to format
 * @returns Formatted time string (e.g., "02:30")
 */
export function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Map database status string to StatusPill status type.
 * Works for both lesson and word statuses.
 * @param status - Database status string
 * @returns StatusType for StatusPill component
 */
export function mapStatus(status: string): StatusType {
  switch (status) {
    case "mastered":
      return "mastered";
    case "studying":
      return "studying";
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
