/**
 * Milestone test scheduling utilities
 *
 * Milestones are fixed-interval tests that come due after lesson completion:
 * - initial: due immediately after first lesson completion
 * - 1-day: 1 day after initial test
 * - 1-week: 7 days after 1-day test
 * - 1-month: 30 days after 1-week test
 * - 1-quarter: 90 days after 1-month test
 * - 1-year: 365 days after 1-quarter test
 */

export type Milestone =
  | "initial"
  | "1-day"
  | "1-week"
  | "1-month"
  | "1-quarter"
  | "1-year";

// Milestone intervals in milliseconds
const DAY_MS = 24 * 60 * 60 * 1000;

export const MILESTONE_INTERVALS: Record<Milestone, number> = {
  initial: 0,
  "1-day": 1 * DAY_MS,
  "1-week": 7 * DAY_MS,
  "1-month": 30 * DAY_MS,
  "1-quarter": 90 * DAY_MS,
  "1-year": 365 * DAY_MS,
};

// Order of milestones for progression
const MILESTONE_ORDER: Milestone[] = [
  "initial",
  "1-day",
  "1-week",
  "1-month",
  "1-quarter",
  "1-year",
];

/**
 * Get the next milestone after the given one
 * Returns null if all milestones are complete
 */
export function getNextMilestone(currentMilestone: Milestone): Milestone | null {
  const currentIndex = MILESTONE_ORDER.indexOf(currentMilestone);
  if (currentIndex === -1 || currentIndex >= MILESTONE_ORDER.length - 1) {
    return null;
  }
  return MILESTONE_ORDER[currentIndex + 1];
}

/**
 * Calculate when the next test is due after completing a milestone
 */
export function calculateNextTestDueAt(
  completedMilestone: Milestone,
  completedAt: Date = new Date()
): Date | null {
  const nextMilestone = getNextMilestone(completedMilestone);
  if (!nextMilestone) {
    return null;
  }

  const interval = MILESTONE_INTERVALS[nextMilestone];
  return new Date(completedAt.getTime() + interval);
}

/**
 * Check if a self-initiated test should count as the upcoming milestone test.
 * Uses 20% of the interval as the "close enough" window.
 * Exception: 1-day milestone has no window (always scheduled separately).
 */
export function shouldCountAsMilestone(
  nextMilestone: Milestone | null,
  nextTestDueAt: Date | null,
  testTakenAt: Date = new Date()
): boolean {
  if (!nextMilestone || !nextTestDueAt) {
    return false;
  }

  // 1-day milestone has no early window - always comes due as scheduled
  if (nextMilestone === "1-day") {
    // Only counts if the test is taken on or after the due date
    return testTakenAt >= nextTestDueAt;
  }

  // For other milestones, use 20% of interval as window
  const interval = MILESTONE_INTERVALS[nextMilestone];
  const windowMs = interval * 0.2;
  const windowStart = new Date(nextTestDueAt.getTime() - windowMs);

  return testTakenAt >= windowStart;
}

/**
 * Get human-readable label for a milestone
 */
export function getMilestoneLabel(milestone: Milestone): string {
  switch (milestone) {
    case "initial":
      return "Initial Test";
    case "1-day":
      return "1 Day Review";
    case "1-week":
      return "1 Week Review";
    case "1-month":
      return "1 Month Review";
    case "1-quarter":
      return "3 Month Review";
    case "1-year":
      return "1 Year Review";
    default:
      return "Test";
  }
}

/**
 * Check if a string is a valid milestone
 */
export function isValidMilestone(value: string | null): value is Milestone {
  if (!value) return false;
  return MILESTONE_ORDER.includes(value as Milestone);
}
