import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GDPR self-serve data export (Art. 15 access / Art. 20 portability).
 *
 * Returns a machine-readable JSON copy of the authenticated user's personal
 * data: their profile plus every per-user table keyed by their id. Read-only.
 *
 * Security: the user id comes ONLY from the validated session (getUser()),
 * never from client input — so a user can only ever export their own data.
 * We use the service-role client to read so the export is complete even for
 * tables whose RLS is service-role-only (e.g. subscriptions, notif prefs).
 *
 * Deliberately excluded: `activity_flags` (internal anti-abuse/fraud moderation
 * signals). Disclosing fraud-prevention data is a recognised limitation on the
 * right of access and could help circumvent those controls.
 */
function unwrap<T>(
  label: string,
  res: { data: T; error: { message: string } | null },
): T {
  if (res.error) {
    throw new Error(`${label}: ${res.error.message}`);
  }
  return res.data;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();
    const uid = user.id;

    // Fetch the profile row and every user-keyed table in parallel.
    const [
      profileRes,
      languagesRes,
      wordProgressRes,
      lessonProgressRes,
      studySessionsRes,
      testSessionsRes,
      dailyActivityRes,
      achievementsRes,
      leagueMembershipsRes,
      leaderboardSnapshotsRes,
      coinTransactionsRes,
      creditTransactionsRes,
      purchasesRes,
      subscriptionsRes,
      notificationsRes,
      notificationPreferencesRes,
      tipDismissalsRes,
      referralsRes,
    ] = await Promise.all([
      admin.from("users").select("*").eq("id", uid).maybeSingle(),
      admin.from("user_languages").select("*").eq("user_id", uid),
      admin.from("user_word_progress").select("*").eq("user_id", uid),
      admin.from("user_lesson_progress").select("*").eq("user_id", uid),
      admin.from("study_sessions").select("*").eq("user_id", uid),
      admin.from("test_sessions").select("*").eq("user_id", uid),
      admin.from("user_daily_activity").select("*").eq("user_id", uid),
      admin.from("user_achievements").select("*").eq("user_id", uid),
      admin.from("league_memberships").select("*").eq("user_id", uid),
      admin.from("weekly_leaderboard_snapshots").select("*").eq("user_id", uid),
      admin.from("coin_transactions").select("*").eq("user_id", uid),
      admin.from("credit_transactions").select("*").eq("user_id", uid),
      admin.from("user_purchases").select("*").eq("user_id", uid),
      admin.from("subscriptions").select("*").eq("user_id", uid),
      admin.from("notifications").select("*").eq("user_id", uid),
      admin.from("user_notification_preferences").select("*").eq("user_id", uid),
      admin.from("user_tip_dismissals").select("*").eq("user_id", uid),
      admin
        .from("referrals")
        .select("*")
        .or(`referrer_id.eq.${uid},referred_user_id.eq.${uid}`),
    ]);

    const testSessions = unwrap("test_sessions", testSessionsRes);

    // test_questions are keyed by test_session_id, not user_id — resolve them
    // from the user's own sessions.
    const sessionIds = (testSessions ?? []).map((s) => s.id);
    const testQuestionsRes = sessionIds.length
      ? await admin.from("test_questions").select("*").in("test_session_id", sessionIds)
      : { data: [], error: null };

    const payload = {
      export: {
        generatedAt: new Date().toISOString(),
        format: "200wad-account-export",
        version: 1,
        notes:
          "A copy of the personal data 200 Words a Day holds about your account. " +
          "Internal anti-abuse moderation flags are not included.",
      },
      account: {
        id: user.id,
        email: user.email ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        authProviders: user.app_metadata?.providers ?? [],
      },
      profile: unwrap("users", profileRes),
      data: {
        languages: unwrap("user_languages", languagesRes),
        wordProgress: unwrap("user_word_progress", wordProgressRes),
        lessonProgress: unwrap("user_lesson_progress", lessonProgressRes),
        studySessions: unwrap("study_sessions", studySessionsRes),
        testSessions,
        testQuestions: unwrap("test_questions", testQuestionsRes),
        dailyActivity: unwrap("user_daily_activity", dailyActivityRes),
        achievements: unwrap("user_achievements", achievementsRes),
        leagueMemberships: unwrap("league_memberships", leagueMembershipsRes),
        leaderboardSnapshots: unwrap("weekly_leaderboard_snapshots", leaderboardSnapshotsRes),
        coinTransactions: unwrap("coin_transactions", coinTransactionsRes),
        creditTransactions: unwrap("credit_transactions", creditTransactionsRes),
        purchases: unwrap("user_purchases", purchasesRes),
        subscriptions: unwrap("subscriptions", subscriptionsRes),
        notifications: unwrap("notifications", notificationsRes),
        notificationPreferences: unwrap(
          "user_notification_preferences",
          notificationPreferencesRes,
        ),
        tipDismissals: unwrap("user_tip_dismissals", tipDismissalsRes),
        referrals: unwrap("referrals", referralsRes),
      },
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="200wad-data-export.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Unexpected error during data export:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
