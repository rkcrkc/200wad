"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import {
  createLessonSchema,
  updateLessonSchema,
  type CreateLessonInput,
  type UpdateLessonInput,
} from "@/lib/validations/admin";
import { revalidatePath } from "next/cache";

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface MutationResult {
  success: boolean;
  error: string | null;
}

export interface CreateLessonResult extends MutationResult {
  id: string | null;
}

// ============================================================================
// CREATE LESSON
// ============================================================================

export async function createLesson(
  input: CreateLessonInput
): Promise<CreateLessonResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = createLessonSchema.parse(input);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("lessons")
      .insert({
        course_id: validated.course_id,
        number: validated.number,
        title: validated.title,
        emoji: validated.emoji,
        sort_order: validated.sort_order ?? 0,
        is_published: validated.is_published ?? false,
        created_by: admin.userId,
        updated_by: admin.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating lesson:", error);
      return { success: false, id: null, error: error.message };
    }

    revalidatePath("/admin/lessons");
    revalidatePath("/lessons");

    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

// ============================================================================
// UPDATE LESSON
// ============================================================================

export async function updateLesson(
  id: string,
  input: UpdateLessonInput
): Promise<MutationResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = updateLessonSchema.parse(input);

    const supabase = await createClient();

    const { error } = await supabase
      .from("lessons")
      .update({
        ...validated,
        updated_by: admin.userId,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating lesson:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/lessons");
    revalidatePath("/lessons");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// DELETE LESSON
// ============================================================================

export async function deleteLesson(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Check for dependent words
    const { count } = await supabase
      .from("words")
      .select("*", { count: "exact", head: true })
      .eq("lesson_id", id);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete lesson with ${count} word(s). Delete words first.`,
      };
    }

    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      console.error("Error deleting lesson:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/lessons");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// PUBLISH/UNPUBLISH LESSON
// ============================================================================

export async function publishLesson(id: string): Promise<MutationResult> {
  return updateLesson(id, { is_published: true });
}

export async function unpublishLesson(id: string): Promise<MutationResult> {
  return updateLesson(id, { is_published: false });
}

// ============================================================================
// REORDER LESSONS
// ============================================================================

export async function reorderLessons(
  courseId: string,
  orderedIds: string[]
): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Update each lesson's sort_order
    const updates = orderedIds.map((id, index) =>
      supabase.from("lessons").update({ sort_order: index }).eq("id", id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error);

    if (firstError?.error) {
      console.error("Error reordering lessons:", firstError.error);
      return { success: false, error: firstError.error.message };
    }

    revalidatePath("/admin/lessons");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// CLONE LESSON
// ============================================================================

export async function cloneLesson(
  lessonId: string,
  targetCourseId?: string
): Promise<CreateLessonResult> {
  try {
    const admin = await requireAdmin();

    const supabase = await createClient();

    // 1. Get the original lesson
    const { data: originalLesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (lessonError || !originalLesson) {
      return { success: false, id: null, error: "Lesson not found" };
    }

    const courseId = targetCourseId || originalLesson.course_id;
    
    if (!courseId) {
      return { success: false, id: null, error: "Course ID is required" };
    }

    // 2. Get the next lesson number in the target course
    const { data: maxLesson } = await supabase
      .from("lessons")
      .select("number")
      .eq("course_id", courseId)
      .order("number", { ascending: false })
      .limit(1)
      .single();

    const nextNumber = (maxLesson?.number || 0) + 1;

    // 3. Create the new lesson
    const { data: newLesson, error: createError } = await supabase
      .from("lessons")
      .insert({
        course_id: courseId,
        number: nextNumber,
        title: `${originalLesson.title} (Copy)`,
        emoji: originalLesson.emoji,
        sort_order: nextNumber,
        is_published: false, // Clones start as draft
        created_by: admin.userId,
        updated_by: admin.userId,
      })
      .select("id")
      .single();

    if (createError || !newLesson) {
      console.error("Error creating cloned lesson:", createError);
      return { success: false, id: null, error: createError?.message || "Failed to create lesson" };
    }

    // 4. Get all words from the original lesson via lesson_words join table
    const { data: originalLessonWords } = await supabase
      .from("lesson_words")
      .select("sort_order, words(*)")
      .eq("lesson_id", lessonId)
      .order("sort_order", { ascending: true });

    if (originalLessonWords && originalLessonWords.length > 0) {
      // 5. Clone words one-by-one to maintain mapping between original and new IDs
      // This ensures we can correctly map example sentences regardless of insert order
      const wordIdMapping = new Map<string, string>(); // originalId -> newId

      for (let i = 0; i < originalLessonWords.length; i++) {
        const lessonWord = originalLessonWords[i];
        const word = lessonWord.words as any;
        if (!word) continue;

        const { data: newWord, error: wordError } = await supabase
          .from("words")
          .insert({
            language_id: word.language_id,
            headword: word.headword,
            lemma: word.lemma,
            english: word.english,
            part_of_speech: word.part_of_speech,
            notes: word.notes,
            memory_trigger_text: word.memory_trigger_text,
            memory_trigger_image_url: word.memory_trigger_image_url,
            audio_url_english: word.audio_url_english,
            audio_url_foreign: word.audio_url_foreign,
            audio_url_trigger: word.audio_url_trigger,
            related_word_ids: [], // Don't copy relationships
            created_by: admin.userId,
            updated_by: admin.userId,
          })
          .select("id")
          .single();

        if (wordError) {
          console.error("Error cloning word:", wordError);
          continue;
        }

        if (newWord) {
          wordIdMapping.set(word.id, newWord.id);
          
          // Create lesson_words association
          await supabase
            .from("lesson_words")
            .insert({
              lesson_id: newLesson.id,
              word_id: newWord.id,
              sort_order: i,
            });
        }
      }

      // 6. Clone example sentences for each word using the mapping
      for (const [originalWordId, newWordId] of wordIdMapping) {
        const { data: sentences } = await supabase
          .from("example_sentences")
          .select("*")
          .eq("word_id", originalWordId)
          .order("sort_order", { ascending: true });

        if (sentences && sentences.length > 0) {
          const newSentences = sentences.map((s, idx) => ({
            word_id: newWordId,
            foreign_sentence: s.foreign_sentence,
            english_sentence: s.english_sentence,
            thumbnail_image_url: s.thumbnail_image_url,
            sort_order: idx,
            created_by: admin.userId,
            updated_by: admin.userId,
          }));

          await supabase.from("example_sentences").insert(newSentences);
        }
      }
    }

    revalidatePath("/admin/lessons");

    return { success: true, id: newLesson.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}
