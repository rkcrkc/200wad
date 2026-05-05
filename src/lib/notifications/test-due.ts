/**
 * Test-due notification helper.
 *
 * Fires `learning.test_due` bell entries for a user's lessons whose milestone
 * test has come due (`next_test_due_at <= now()`) and that haven't already
 * been notified for this exact (lesson, milestone) cycle.
 *
 * Trigger model: lazy. Called server-side from `getScheduleData()` so the
 * notification appears the next time the user opens the dashboard / schedule
 * page — no cron required. Idempotency keys off
 * `notifications.data->>{template_key, lesson_id, milestone}` so when the
 * user takes the test and the milestone advances, the next cycle's notification
 * fires fresh.
 *
 * All errors are logged and swallowed; never throws.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { insertFromTemplate } from "@/lib/notifications/template";
import type { Milestone } from "@/lib/utils/milestones";

/**
 * Human-friendly label for a milestone string. Keep in sync with the
 * `Milestone` union in `src/lib/utils/milestones.ts`.
 */
const MILESTONE_LABELS: Record<Milestone, string> = {
  initial: "first",
  "1-day": "1-day",
  "1-week": "1-week",
  "1-month": "1-month",
  "1-quarter": "1-quarter",
  "1-year": "1-year",
};

function milestoneLabel(milestone: string): string {
  return MILESTONE_LABELS[milestone as Milestone] ?? milestone;
}

interface DueLessonRow {
  lesson_id: string;
  next_milestone: string | null;
  lessons:
    | { title: string | null }
    | { title: string | null }[]
    | null;
}

interface ExistingNotificationRow {
  data: Record<string, unknown> | null;
}

function lessonTitleFrom(row: DueLessonRow): string | null {
  if (!row.lessons) return null;
  if (Array.isArray(row.lessons)) {
    return row.lessons[0]?.title ?? null;
  }
  return row.lessons.title ?? null;
}

/**
 * For each currently-due milestone test, fire `learning.test_due` once per
 * (lesson, milestone). Safe to call on every page load — does at most two
 * lightweight queries when there's nothing to do.
 */
export async function recordTestDueNotifications(
  userId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 1) Currently due milestone tests for this user.
    const { data: dueLessons, error: dueErr } = await supabase
      .from("user_lesson_progress")
      .select("lesson_id, next_milestone, lessons(title)")
      .eq("user_id", userId)
      .not("next_milestone", "is", null)
      .lte("next_test_due_at", now);

    if (dueErr) {
      console.error(
        "recordTestDueNotifications due-lesson query failed:",
        dueErr.message
      );
      return;
    }
    if (!dueLessons || dueLessons.length === 0) return;

    // 2) One bulk lookup of every test_due notification this user already has,
    //    so we can dedupe per (lesson_id, milestone) without N round-trips.
    const { data: existing, error: existingErr } = await supabase
      .from("notifications")
      .select("data")
      .eq("user_id", userId)
      .eq("data->>template_key", "learning.test_due");

    if (existingErr) {
      console.error(
        "recordTestDueNotifications dedup query failed:",
        existingErr.message
      );
      return;
    }

    const fired = new Set<string>();
    for (const row of (existing ?? []) as ExistingNotificationRow[]) {
      const data = row.data;
      if (!data) continue;
      const key = `${String(data.lesson_id ?? "")}|${String(data.milestone ?? "")}`;
      fired.add(key);
    }

    // 3) Fire any not-yet-fired (lesson, milestone) combos. Sequential to keep
    //    this cheap on the request path; due-test counts are typically small.
    for (const row of dueLessons as DueLessonRow[]) {
      const milestone = row.next_milestone;
      const lessonId = row.lesson_id;
      if (!milestone || !lessonId) continue;

      const dedupeKey = `${lessonId}|${milestone}`;
      if (fired.has(dedupeKey)) continue;

      const title = lessonTitleFrom(row) ?? "your lesson";

      await insertFromTemplate("learning.test_due", {
        userId,
        dataOverrides: {
          lesson_id: lessonId,
          lesson_title: title,
          milestone,
          milestone_label: milestoneLabel(milestone),
          href: `/lesson/${lessonId}/test`,
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("recordTestDueNotifications failed:", message);
  }
}
