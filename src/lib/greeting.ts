export type TimeOfDay = "morning" | "afternoon" | "evening";

/**
 * Resolve the time-of-day bucket from a Date.
 * morning: 00:00–11:59, afternoon: 12:00–17:59, evening: 18:00–23:59.
 * Uses the given date's local hours — pass `new Date()` on the client so the
 * greeting reflects the user's own clock, not the server's timezone.
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
