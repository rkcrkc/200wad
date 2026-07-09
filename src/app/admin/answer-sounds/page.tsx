import { createAdminClient } from "@/lib/supabase/admin";
import { AnswerSoundsClient } from "./AnswerSoundsClient";

const GRADE_ORDER = ["correct", "half-correct", "incorrect"];

async function getAnswerSounds() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("answer_feedback_sounds")
    .select("grade, audio_url, enabled, updated_at");

  if (error) {
    console.error("Error fetching answer feedback sounds:", error);
    return [];
  }

  return (data ?? []).sort(
    (a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade)
  );
}

export default async function AnswerSoundsPage() {
  const sounds = await getAnswerSounds();
  return <AnswerSoundsClient sounds={sounds} />;
}
