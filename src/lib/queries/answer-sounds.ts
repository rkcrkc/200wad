/**
 * Answer feedback sounds — the admin-managed SFX played when a learner submits
 * a test answer (correct / half-correct / incorrect).
 *
 * The table is public-read (guests hear feedback too), so this uses the normal
 * server client rather than the admin client. Writes happen admin-side; see
 * `src/lib/mutations/admin/answer-sounds.ts`.
 */

import { createClient } from "@/lib/supabase/server";
import type { AnswerGrade } from "@/lib/utils/scoring";

/**
 * Client-safe map of grade → audio URL. Only *enabled* sounds are included, so
 * a missing key means "don't play" (mirrors the getToastTemplates convention).
 */
export type AnswerFeedbackSoundMap = Partial<Record<AnswerGrade, string>>;

export async function getAnswerFeedbackSounds(): Promise<AnswerFeedbackSoundMap> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("answer_feedback_sounds")
    .select("grade, audio_url, enabled")
    .eq("enabled", true);

  if (error) {
    console.error("getAnswerFeedbackSounds failed:", error.message);
    return {};
  }

  const result: AnswerFeedbackSoundMap = {};
  for (const row of data ?? []) {
    result[row.grade as AnswerGrade] = row.audio_url;
  }
  return result;
}
