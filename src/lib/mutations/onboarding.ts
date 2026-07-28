"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface AddLanguageWithCourseResult {
  success: boolean;
  error: string | null;
  courseId: string | null;
}

/**
 * Pure enrollment: inserts the `user_languages` row (if missing) and sets the
 * user's `current_language_id`/`current_course_id`. Honours `preferredCourseId`
 * when given, otherwise falls back to the first published course.
 *
 * Deliberately does NOT call `revalidatePath`, so it is safe to call during
 * render (e.g. from the schedule page or the root redirect). Server-action
 * callers that need cache invalidation should use `addLanguageWithCourse`.
 */
export async function enrollLanguageAndSetCurrent(
  languageId: string,
  preferredCourseId?: string
): Promise<AddLanguageWithCourseResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated", courseId: null };
  }

  // Check if already has this language
  const { data: existing } = await supabase
    .from("user_languages")
    .select("id")
    .eq("user_id", user.id)
    .eq("language_id", languageId)
    .single();

  if (!existing) {
    // Add language to user_languages
    const { error: langError } = await supabase.from("user_languages").insert({
      user_id: user.id,
      language_id: languageId,
      is_current: true,
    });

    if (langError) {
      console.error("Error adding language:", langError);
      return { success: false, error: langError.message, courseId: null };
    }
  }

  // Resolve the course to make current: the preferred one (when published and
  // in this language) if provided, else the first published course.
  let courseId: string | null = null;

  if (preferredCourseId) {
    const { data: preferred } = await supabase
      .from("courses")
      .select("id")
      .eq("id", preferredCourseId)
      .eq("language_id", languageId)
      .eq("is_published", true)
      .maybeSingle();
    courseId = preferred?.id ?? null;
  }

  if (!courseId) {
    const { data: courses, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("language_id", languageId)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(1);

    if (courseError) {
      console.error("Error fetching course:", courseError);
      return { success: false, error: courseError.message, courseId: null };
    }

    if (!courses || courses.length === 0) {
      return {
        success: false,
        error: "No courses available for this language",
        courseId: null,
      };
    }

    courseId = courses[0].id;
  }

  // Update user with current_language_id and current_course_id
  const { error: updateError } = await supabase
    .from("users")
    .update({
      current_language_id: languageId,
      current_course_id: courseId,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Error updating user:", updateError);
    return { success: false, error: updateError.message, courseId: null };
  }

  return { success: true, error: null, courseId };
}

/**
 * Server-action wrapper around `enrollLanguageAndSetCurrent` that also
 * revalidates the pages showing enrolled languages. Use this from interactive
 * callers (menus/forms) — NOT during render.
 */
export async function addLanguageWithCourse(
  languageId: string
): Promise<AddLanguageWithCourseResult> {
  const result = await enrollLanguageAndSetCurrent(languageId);

  if (result.success) {
    revalidatePath("/dashboard");
    revalidatePath("/settings");
  }

  return result;
}
