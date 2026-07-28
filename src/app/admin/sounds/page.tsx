import { createAdminClient } from "@/lib/supabase/admin";
import { SoundsTabs } from "./SoundsTabs";

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

async function getMusicTracks() {
  const supabase = createAdminClient();
  const { data: tracks, error } = await supabase
    .from("study_music_tracks")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching music tracks:", error);
    return [];
  }

  return tracks;
}

export default async function SoundsPage() {
  const [answerSounds, musicTracks] = await Promise.all([
    getAnswerSounds(),
    getMusicTracks(),
  ]);

  return <SoundsTabs answerSounds={answerSounds} musicTracks={musicTracks} />;
}
