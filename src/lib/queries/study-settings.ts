/**
 * Account-scoped study/test toggles. These pre-hydrate `useAudio` in study and
 * test mode so a logged-in user's choices (answer-feedback sounds, play memory
 * trigger) follow them across devices instead of living only in localStorage.
 *
 * A `null` field means the user has never explicitly set that toggle — the
 * client then falls back to its localStorage value (and backfills it up to the
 * account) or the app default. Guests always get `null` (no row to read).
 * Word-audio volume is intentionally not synced (kept per-device).
 */

import { createClient } from "@/lib/supabase/server";

export interface UserStudySettings {
  soundEffectsEnabled: boolean | null;
  replayTriggerEnabled: boolean | null;
}

const GUEST_SETTINGS: UserStudySettings = {
  soundEffectsEnabled: null,
  replayTriggerEnabled: null,
};

export async function getUserStudySettings(): Promise<UserStudySettings> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return GUEST_SETTINGS;

  const { data, error } = await supabase
    .from("users")
    .select("sound_effects_enabled, replay_trigger_enabled")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    if (error) console.error("getUserStudySettings failed:", error.message);
    return GUEST_SETTINGS;
  }

  return {
    soundEffectsEnabled: data.sound_effects_enabled,
    replayTriggerEnabled: data.replay_trigger_enabled,
  };
}
