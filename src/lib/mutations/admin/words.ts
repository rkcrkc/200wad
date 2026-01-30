"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import {
  createWordSchema,
  updateWordSchema,
  type CreateWordInput,
  type UpdateWordInput,
} from "@/lib/validations/admin";
import { revalidatePath } from "next/cache";
import { deleteEntityFiles } from "@/lib/supabase/storage";

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface MutationResult {
  success: boolean;
  error: string | null;
}

export interface CreateWordResult extends MutationResult {
  id: string | null;
}

// ============================================================================
// CREATE WORD
// ============================================================================

export async function createWord(
  input: CreateWordInput
): Promise<CreateWordResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = createWordSchema.parse(input);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("words")
      .insert({
        lesson_id: validated.lesson_id,
        english: validated.english,
        foreign_word: validated.foreign_word,
        part_of_speech: validated.part_of_speech,
        notes: validated.notes,
        memory_trigger_text: validated.memory_trigger_text,
        memory_trigger_image_url: validated.memory_trigger_image_url,
        audio_url_english: validated.audio_url_english,
        audio_url_foreign: validated.audio_url_foreign,
        audio_url_trigger: validated.audio_url_trigger,
        related_word_ids: validated.related_word_ids ?? [],
        sort_order: validated.sort_order ?? 0,
        created_by: admin.userId,
        updated_by: admin.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating word:", error);
      return { success: false, id: null, error: error.message };
    }

    revalidatePath("/admin/words");
    revalidatePath(`/admin/words/${validated.lesson_id}`);
    revalidatePath("/admin/lessons");

    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

// ============================================================================
// UPDATE WORD
// ============================================================================

export async function updateWord(
  id: string,
  input: UpdateWordInput
): Promise<MutationResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = updateWordSchema.parse(input);

    const supabase = await createClient();

    // Get the word's lesson_id for revalidation
    const { data: word } = await supabase
      .from("words")
      .select("lesson_id")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("words")
      .update({
        ...validated,
        updated_by: admin.userId,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating word:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/words");
    if (word?.lesson_id) {
      revalidatePath(`/admin/words/${word.lesson_id}`);
    }

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// DELETE WORD
// ============================================================================

export async function deleteWord(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Get the word to find its lesson_id for revalidation
    const { data: word } = await supabase
      .from("words")
      .select("lesson_id")
      .eq("id", id)
      .single();

    // Delete storage files for this word (both images and audio)
    await Promise.all([
      deleteEntityFiles("images", "words", id),
      deleteEntityFiles("audio", "words", id),
    ]);

    // Delete will cascade to example_sentences due to FK constraint
    const { error } = await supabase.from("words").delete().eq("id", id);

    if (error) {
      console.error("Error deleting word:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/words");
    if (word?.lesson_id) {
      revalidatePath(`/admin/words/${word.lesson_id}`);
    }
    revalidatePath("/admin/lessons");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// REORDER WORDS
// ============================================================================

export async function reorderWords(
  lessonId: string,
  orderedIds: string[]
): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Update each word's sort_order
    const updates = orderedIds.map((id, index) =>
      supabase.from("words").update({ sort_order: index }).eq("id", id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error);

    if (firstError?.error) {
      console.error("Error reordering words:", firstError.error);
      return { success: false, error: firstError.error.message };
    }

    revalidatePath("/admin/words");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
