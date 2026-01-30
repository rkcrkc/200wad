"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import {
  createCourseSchema,
  updateCourseSchema,
  type CreateCourseInput,
  type UpdateCourseInput,
} from "@/lib/validations/admin";
import { revalidatePath } from "next/cache";

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface MutationResult {
  success: boolean;
  error: string | null;
}

export interface CreateCourseResult extends MutationResult {
  id: string | null;
}

// ============================================================================
// CREATE COURSE
// ============================================================================

export async function createCourse(
  input: CreateCourseInput
): Promise<CreateCourseResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = createCourseSchema.parse(input);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("courses")
      .insert({
        language_id: validated.language_id,
        name: validated.name,
        description: validated.description,
        level: validated.level,
        cefr_range: validated.cefr_range,
        free_lessons: validated.free_lessons ?? 10,
        price_cents: validated.price_cents ?? 5000,
        sort_order: validated.sort_order ?? 0,
        is_published: validated.is_published ?? false,
        created_by: admin.userId,
        updated_by: admin.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating course:", error);
      return { success: false, id: null, error: error.message };
    }

    revalidatePath("/admin/courses");
    revalidatePath("/dashboard");
    revalidatePath("/courses");

    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

// ============================================================================
// UPDATE COURSE
// ============================================================================

export async function updateCourse(
  id: string,
  input: UpdateCourseInput
): Promise<MutationResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = updateCourseSchema.parse(input);

    const supabase = await createClient();

    const { error } = await supabase
      .from("courses")
      .update({
        ...validated,
        updated_by: admin.userId,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating course:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/courses");
    revalidatePath("/dashboard");
    revalidatePath("/courses");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// DELETE COURSE
// ============================================================================

export async function deleteCourse(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Check for dependent lessons
    const { count } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("course_id", id);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete course with ${count} lesson(s). Delete lessons first.`,
      };
    }

    const { error } = await supabase.from("courses").delete().eq("id", id);

    if (error) {
      console.error("Error deleting course:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/courses");
    revalidatePath("/dashboard");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// PUBLISH/UNPUBLISH COURSE
// ============================================================================

export async function publishCourse(id: string): Promise<MutationResult> {
  return updateCourse(id, { is_published: true });
}

export async function unpublishCourse(id: string): Promise<MutationResult> {
  return updateCourse(id, { is_published: false });
}

// ============================================================================
// REORDER COURSES
// ============================================================================

export async function reorderCourses(
  languageId: string,
  orderedIds: string[]
): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Update each course's sort_order
    const updates = orderedIds.map((id, index) =>
      supabase.from("courses").update({ sort_order: index }).eq("id", id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error);

    if (firstError?.error) {
      console.error("Error reordering courses:", firstError.error);
      return { success: false, error: firstError.error.message };
    }

    revalidatePath("/admin/courses");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
