import { createAdminClient } from "@/lib/supabase/admin";
import { MusicClient } from "./MusicClient";

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

export default async function MusicPage() {
  const tracks = await getMusicTracks();

  return (
    <div>
      <MusicClient tracks={tracks} />
    </div>
  );
}
