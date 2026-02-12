"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { ZodError } from "zod";
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

    // Get language_id from the lesson's course
    const { data: lesson } = await supabase
      .from("lessons")
      .select("courses(language_id)")
      .eq("id", validated.lesson_id)
      .single();

    if (!lesson?.courses) {
      return { success: false, id: null, error: "Lesson not found or has no course" };
    }

    const languageId = (lesson.courses as { language_id: string }).language_id;
    if (!languageId) {
      return { success: false, id: null, error: "Course has no language" };
    }

    // Create the word
    const { data: word, error: wordError } = await supabase
      .from("words")
      .insert({
        language_id: languageId,
        headword: validated.headword,
        lemma: validated.lemma || validated.headword, // Default lemma to headword
        english: validated.english,
        category: validated.category,
        part_of_speech: validated.category === "word" ? validated.part_of_speech : null,
        gender: validated.gender,
        transitivity: validated.transitivity,
        is_irregular: validated.is_irregular ?? false,
        grammatical_number: validated.part_of_speech === "noun"
          ? (validated.grammatical_number || "sg")
          : validated.grammatical_number,
        notes: validated.notes,
        memory_trigger_text: validated.memory_trigger_text,
        memory_trigger_image_url: validated.memory_trigger_image_url,
        audio_url_english: validated.audio_url_english,
        audio_url_foreign: validated.audio_url_foreign,
        audio_url_trigger: validated.audio_url_trigger,
        related_word_ids: validated.related_word_ids ?? [],
        created_by: admin.userId,
        updated_by: admin.userId,
      })
      .select("id")
      .single();

    if (wordError) {
      console.error("Error creating word:", wordError);
      return { success: false, id: null, error: wordError.message };
    }

    // Create the lesson_words association
    const { error: linkError } = await supabase
      .from("lesson_words")
      .insert({
        lesson_id: validated.lesson_id,
        word_id: word.id,
        sort_order: validated.sort_order ?? 0,
      });

    if (linkError) {
      console.error("Error linking word to lesson:", linkError);
      // Attempt to clean up the word we just created
      await supabase.from("words").delete().eq("id", word.id);
      return { success: false, id: null, error: linkError.message };
    }

    revalidatePath("/admin/words");
    revalidatePath(`/admin/words/${validated.lesson_id}`);
    revalidatePath("/admin/lessons");

    return { success: true, id: word.id, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.issues[0];
      const fieldName = firstError.path.join(".");
      return { success: false, id: null, error: `${fieldName}: ${firstError.message}` };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

// ============================================================================
// UPDATE WORD
// ============================================================================

export async function updateWord(
  id: string,
  input: UpdateWordInput,
  lessonId?: string
): Promise<MutationResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = updateWordSchema.parse(input);

    const supabase = await createClient();

    // Update the word (excluding sort_order which is now on lesson_words)
    const { error } = await supabase
      .from("words")
      .update({
        headword: validated.headword,
        lemma: validated.lemma ?? undefined,
        english: validated.english,
        category: validated.category ?? undefined,
        part_of_speech: validated.part_of_speech ?? undefined,
        gender: validated.gender ?? undefined,
        transitivity: validated.transitivity ?? undefined,
        is_irregular: validated.is_irregular ?? undefined,
        grammatical_number: validated.grammatical_number ?? undefined,
        notes: validated.notes ?? undefined,
        memory_trigger_text: validated.memory_trigger_text ?? undefined,
        memory_trigger_image_url: validated.memory_trigger_image_url ?? undefined,
        audio_url_english: validated.audio_url_english ?? undefined,
        audio_url_foreign: validated.audio_url_foreign ?? undefined,
        audio_url_trigger: validated.audio_url_trigger ?? undefined,
        related_word_ids: validated.related_word_ids,
        updated_by: admin.userId,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating word:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/words");
    if (lessonId) {
      revalidatePath(`/admin/words/${lessonId}`);
    }

    return { success: true, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.issues[0];
      const fieldName = firstError.path.join(".");
      return { success: false, error: `${fieldName}: ${firstError.message}` };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// DELETE WORD
// ============================================================================

export async function deleteWord(id: string, lessonId?: string): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Delete storage files for this word (both images and audio)
    await Promise.all([
      deleteEntityFiles("images", "words", id),
      deleteEntityFiles("audio", "words", id),
    ]);

    // Delete will cascade to lesson_words and example_sentences due to FK constraints
    const { error } = await supabase.from("words").delete().eq("id", id);

    if (error) {
      console.error("Error deleting word:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/words");
    if (lessonId) {
      revalidatePath(`/admin/words/${lessonId}`);
    }
    revalidatePath("/admin/lessons");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// REORDER WORDS IN A LESSON
// ============================================================================

export async function reorderWords(
  lessonId: string,
  orderedIds: string[]
): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Update sort_order in the lesson_words join table
    const updates = orderedIds.map((wordId, index) =>
      supabase
        .from("lesson_words")
        .update({ sort_order: index })
        .eq("lesson_id", lessonId)
        .eq("word_id", wordId)
    );

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error);

    if (firstError?.error) {
      console.error("Error reordering words:", firstError.error);
      return { success: false, error: firstError.error.message };
    }

    revalidatePath("/admin/words");
    revalidatePath(`/admin/words/${lessonId}`);

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// ADD EXISTING WORD TO LESSON
// ============================================================================

export async function addWordToLesson(
  wordId: string,
  lessonId: string,
  sortOrder?: number
): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Get current max sort_order if not provided
    let order = sortOrder;
    if (order === undefined) {
      const { data: existing } = await supabase
        .from("lesson_words")
        .select("sort_order")
        .eq("lesson_id", lessonId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();
      
      order = (existing?.sort_order ?? -1) + 1;
    }

    const { error } = await supabase
      .from("lesson_words")
      .insert({
        lesson_id: lessonId,
        word_id: wordId,
        sort_order: order,
      });

    if (error) {
      console.error("Error adding word to lesson:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/words");
    revalidatePath(`/admin/words/${lessonId}`);
    revalidatePath("/admin/lessons");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// REMOVE WORD FROM LESSON (without deleting the word)
// ============================================================================

export async function removeWordFromLesson(
  wordId: string,
  lessonId: string
): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("lesson_words")
      .delete()
      .eq("lesson_id", lessonId)
      .eq("word_id", wordId);

    if (error) {
      console.error("Error removing word from lesson:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/words");
    revalidatePath(`/admin/words/${lessonId}`);
    revalidatePath("/admin/lessons");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
