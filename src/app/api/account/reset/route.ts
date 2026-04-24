import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resets the authenticated user's study/test data back to day 1.
 *
 * Wipes: word/lesson progress, study sessions, test scores (cascades to
 * test_questions), daily activity, activity flags, tip dismissals, leaderboard
 * snapshots, and notifications.
 *
 * Also resets streak, league, vocabulary count, and last activity fields on
 * the users row.
 *
 * Does NOT touch: the account itself, subscriptions, credits, profile info,
 * user_languages, or the user's referral code.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const userId = user.id;

    // Tables to clear for this user. Each FK to users is ON DELETE CASCADE
    // from the DB, but we delete explicitly (not the user row) so we can
    // target by user_id without touching the account.
    const tablesToClear = [
      "user_word_progress",
      "user_lesson_progress",
      "study_sessions",
      "user_test_scores", // cascades to test_questions via test_score_id
      "user_daily_activity",
      "activity_flags",
      "user_tip_dismissals",
      "weekly_leaderboard_snapshots",
      "notifications",
    ] as const;

    for (const table of tablesToClear) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq("user_id", userId);

      if (error) {
        console.error(`Error clearing ${table}:`, error);
        return NextResponse.json(
          { error: `Failed to clear ${table}: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Reset aggregate fields on the users row.
    const { error: userUpdateError } = await adminClient
      .from("users")
      .update({
        current_streak: 0,
        longest_streak: 0,
        league: null,
        league_points: 0,
        total_vocabulary_count: 0,
        last_activity_date: null,
      })
      .eq("id", userId);

    if (userUpdateError) {
      console.error("Error resetting user fields:", userUpdateError);
      return NextResponse.json(
        { error: `Failed to reset user fields: ${userUpdateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Account reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error during account reset:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
