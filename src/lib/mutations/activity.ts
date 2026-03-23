"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Record user activity at the end of a study or test session.
 * Calls the update_daily_activity RPC which:
 * - Upserts the daily activity row
 * - Updates streak on users table
 * - Awards streak milestone rewards
 */
export async function recordActivity(params: {
  languageId: string;
  wordsStudied?: number;
  wordsMastered?: number;
  testPointsEarned?: number;
  testMaxPoints?: number;
  studyTimeSeconds?: number;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { error } = await supabase.rpc("update_daily_activity", {
    p_user_id: user.id,
    p_language_id: params.languageId,
    p_words_studied: params.wordsStudied || 0,
    p_words_mastered: params.wordsMastered || 0,
    p_test_points_earned: params.testPointsEarned || 0,
    p_test_max_points: params.testMaxPoints || 0,
    p_study_time_seconds: params.studyTimeSeconds || 0,
  });

  if (error) {
    console.error("Error recording activity:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
