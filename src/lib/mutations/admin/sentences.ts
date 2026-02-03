"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import {
  createSentenceSchema,
  updateSentenceSchema,
  type CreateSentenceInput,
  type UpdateSentenceInput,
} from "@/lib/validations/admin";
import { revalidatePath } from "next/cache";

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface MutationResult {
  success: boolean;
  error: string | null;
}

export interface CreateSentenceResult extends MutationResult {
  id: string | null;
}

// ============================================================================
// CREATE SENTENCE
// ============================================================================

export async function createSentence(
  input: CreateSentenceInput
): Promise<CreateSentenceResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = createSentenceSchema.parse(input);

    const supabase = await createClient();

    // Get lesson IDs for revalidation (word can be in multiple lessons)
    const { data: lessonWords } = await supabase
      .from("lesson_words")
      .select("lesson_id")
      .eq("word_id", validated.word_id);

    const { data, error } = await supabase
      .from("example_sentences")
      .insert({
        word_id: validated.word_id,
        foreign_sentence: validated.foreign_sentence,
        english_sentence: validated.english_sentence,
        thumbnail_image_url: validated.thumbnail_image_url,
        sort_order: validated.sort_order ?? 0,
        created_by: admin.userId,
        updated_by: admin.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating sentence:", error);
      return { success: false, id: null, error: error.message };
    }

    revalidatePath("/admin/words");
    lessonWords?.forEach((lw) => {
      revalidatePath(`/admin/words/${lw.lesson_id}`);
    });

    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

// ============================================================================
// UPDATE SENTENCE
// ============================================================================

export async function updateSentence(
  id: string,
  input: UpdateSentenceInput
): Promise<MutationResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = updateSentenceSchema.parse(input);

    const supabase = await createClient();

    const { error } = await supabase
      .from("example_sentences")
      .update({
        ...validated,
        updated_by: admin.userId,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating sentence:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/words");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// DELETE SENTENCE
// ============================================================================

export async function deleteSentence(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Get the sentence's word_id to find lesson IDs for revalidation
    const { data: sentence } = await supabase
      .from("example_sentences")
      .select("word_id")
      .eq("id", id)
      .single();

    let lessonIds: string[] = [];
    if (sentence?.word_id) {
      const { data: lessonWords } = await supabase
        .from("lesson_words")
        .select("lesson_id")
        .eq("word_id", sentence.word_id);
      lessonIds = lessonWords?.map((lw) => lw.lesson_id) || [];
    }

    const { error } = await supabase
      .from("example_sentences")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting sentence:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/words");
    lessonIds.forEach((lessonId) => {
      revalidatePath(`/admin/words/${lessonId}`);
    });

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
