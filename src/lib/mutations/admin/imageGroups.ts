"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";
import {
  createImageGroupSchema,
  updateImageGroupSchema,
  type CreateImageGroupInput,
  type UpdateImageGroupInput,
} from "@/lib/validations/admin";
import {
  getImageGroupMembers,
  type ImageGroupMember,
} from "@/lib/queries/imageGroups";
import { ZodError } from "zod";

function revalidateImageGroups() {
  revalidatePath("/admin/image-groups");
  revalidatePath("/admin/words");
}

/**
 * Server-action wrapper around the service-role members query, so the admin
 * edit modal (a client component) can lazily load a group's member list.
 */
export async function listImageGroupMembers(
  groupId: string
): Promise<ImageGroupMember[]> {
  await requireAdmin();
  return getImageGroupMembers(groupId);
}

/** A group option for the word modal's group selector. */
export interface ImageGroupOption {
  id: string;
  key: string;
  label: string;
  master_image_url: string | null;
}

/**
 * List the groups belonging to a course, for the word-edit modal's group
 * selector. Service-role; ordered by label.
 */
export async function listImageGroupsForCourse(
  courseId: string
): Promise<ImageGroupOption[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("word_image_groups")
    .select("id, key, label, master_image_url")
    .eq("course_id", courseId)
    .order("label", { ascending: true });

  if (error) {
    console.error("Error listing image groups for course:", error);
    return [];
  }

  return data ?? [];
}

export async function createImageGroup(input: CreateImageGroupInput) {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const validated = createImageGroupSchema.parse(input);

    const { data: group, error } = await supabase
      .from("word_image_groups")
      .insert({
        course_id: validated.course_id,
        key: validated.key,
        label: validated.label,
        master_image_url: validated.master_image_url ?? null,
        is_exception: validated.is_exception,
        english_suffix: validated.english_suffix ?? null,
        italian_suffix: validated.italian_suffix ?? null,
        notes: validated.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !group) {
      return {
        success: false,
        error: error?.message ?? "Failed to create image group",
        id: null,
      };
    }

    revalidateImageGroups();
    return { success: true, error: null, id: group.id };
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.issues[0];
      const fieldName = firstError.path.join(".");
      return { success: false, error: `${fieldName}: ${firstError.message}`, id: null };
    }
    return { success: false, error: "Unexpected error", id: null };
  }
}

/**
 * Update a group. Setting `master_image_url` fires the AFTER UPDATE trigger
 * (`word_image_groups_fanout`), which re-materializes `memory_trigger_image_url`
 * for every inheriting member in one bulk statement.
 */
export async function updateImageGroup(id: string, input: UpdateImageGroupInput) {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const validated = updateImageGroupSchema.parse(input);

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (validated.key !== undefined) updatePayload.key = validated.key;
    if (validated.label !== undefined) updatePayload.label = validated.label;
    if (validated.master_image_url !== undefined)
      updatePayload.master_image_url = validated.master_image_url;
    if (validated.is_exception !== undefined)
      updatePayload.is_exception = validated.is_exception;
    if (validated.english_suffix !== undefined)
      updatePayload.english_suffix = validated.english_suffix;
    if (validated.italian_suffix !== undefined)
      updatePayload.italian_suffix = validated.italian_suffix;
    if (validated.notes !== undefined) updatePayload.notes = validated.notes;

    const { error } = await supabase
      .from("word_image_groups")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateImageGroups();
    return { success: true, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.issues[0];
      const fieldName = firstError.path.join(".");
      return { success: false, error: `${fieldName}: ${firstError.message}` };
    }
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Delete a group. The `words.image_group_id` FK is ON DELETE SET NULL, so
 * members are detached. Inheriting members (no override) will then resolve to a
 * NULL image — callers should warn before deleting. (The per-row resolve trigger
 * does not fire here because the FK action updates the column directly, but the
 * effective URL was already materialized; detached inheritors keep their last
 * materialized value until next edited.)
 */
export async function deleteImageGroup(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("word_image_groups")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateImageGroups();
  return { success: true, error: null };
}

/**
 * Assign a word to a group (or detach with `null`). Clears any per-word override
 * when joining a group so the word inherits the group master. The BEFORE trigger
 * on `words` re-materializes `memory_trigger_image_url`.
 */
export async function assignWordToGroup(wordId: string, groupId: string | null) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("words")
    .update({
      image_group_id: groupId,
      // Joining a group means inherit the master; detaching clears the link too.
      image_override_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wordId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateImageGroups();
  return { success: true, error: null };
}

/**
 * Set or clear a word's per-word image override. `null` re-inherits the group
 * master (if the word is in a group) or clears the image (if it is a one-off).
 * The BEFORE trigger re-materializes `memory_trigger_image_url`.
 */
export async function setWordImageOverride(wordId: string, url: string | null) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("words")
    .update({
      image_override_url: url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wordId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateImageGroups();
  return { success: true, error: null };
}
