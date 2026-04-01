"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { StudyMusicTrackInsert, StudyMusicTrackUpdate } from "@/types/database";

export async function createMusicTrack(data: {
  name: string;
  author?: string | null;
  description?: string | null;
  category?: string | null;
  bpm?: number | null;
  duration_seconds: number;
  file_path: string;
  file_size?: number | null;
}) {
  const supabase = createAdminClient();

  // Get the next sort_order
  const { data: maxOrder } = await supabase
    .from("study_music_tracks")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { data: track, error } = await supabase
    .from("study_music_tracks")
    .insert({
      ...data,
      sort_order: nextOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating music track:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/music");
  return { success: true, track };
}

export async function updateMusicTrack(
  id: string,
  data: Partial<StudyMusicTrackUpdate>
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("study_music_tracks")
    .update(data)
    .eq("id", id);

  if (error) {
    console.error("Error updating music track:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/music");
  return { success: true };
}

export async function deleteMusicTrack(id: string) {
  const supabase = createAdminClient();

  // First get the track to delete its file
  const { data: track } = await supabase
    .from("study_music_tracks")
    .select("file_path")
    .eq("id", id)
    .single();

  // Delete the file from storage
  if (track?.file_path) {
    const { error: storageError } = await supabase.storage
      .from("audio")
      .remove([track.file_path]);

    if (storageError) {
      console.error("Error deleting audio file:", storageError);
      // Continue with track deletion even if file deletion fails
    }
  }

  // Delete the track record
  const { error } = await supabase
    .from("study_music_tracks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting music track:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/music");
  return { success: true };
}

export async function reorderMusicTracks(trackIds: string[]) {
  const supabase = createAdminClient();

  // Update sort_order for each track
  const updates = trackIds.map((id, index) =>
    supabase
      .from("study_music_tracks")
      .update({ sort_order: index })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    console.error("Error reordering tracks:", errors);
    return { success: false, error: "Failed to reorder some tracks" };
  }

  revalidatePath("/admin/music");
  return { success: true };
}

export async function toggleMusicTrackActive(id: string, isActive: boolean) {
  return updateMusicTrack(id, { is_active: isActive });
}

/**
 * Upload an audio file to Supabase Storage
 * Returns the file path (not the full URL)
 */
export async function uploadMusicFile(formData: FormData) {
  const supabase = createAdminClient();

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  if (!file.type.startsWith("audio/")) {
    return { success: false, error: "File must be an audio file" };
  }

  // Generate a unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `study-music/${timestamp}-${sanitizedName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("audio")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Error uploading audio file:", error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    filePath: data.path,
    fileSize: file.size,
  };
}
