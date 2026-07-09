"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";

const VALID_GRADES = ["correct", "half-correct", "incorrect"] as const;
type Grade = (typeof VALID_GRADES)[number];

/**
 * Toggle a single answer-feedback sound on/off globally. When disabled, the
 * grade is omitted from the client-facing map and no SFX plays for it.
 * (File replacement goes through /api/admin/upload-answer-sound.)
 */
export async function setAnswerFeedbackSoundEnabled(
  grade: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  if (!VALID_GRADES.includes(grade as Grade)) {
    return { success: false, error: "Invalid grade" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("answer_feedback_sounds")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("grade", grade);

  if (error) {
    console.error("setAnswerFeedbackSoundEnabled failed:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/answer-sounds");
  return { success: true };
}
