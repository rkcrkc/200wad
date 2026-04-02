"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function createHelpEntry(data: {
  title: string;
  slug?: string;
  content: string;
  category: string;
  is_published?: boolean;
  preview?: string | null;
  language_codes?: string[] | null;
}) {
  const supabase = createAdminClient();

  // Auto-generate slug from title if not provided
  const slug = data.slug || slugify(data.title);

  // Get the next sort_order within category
  const { data: maxOrder } = await supabase
    .from("help_entries")
    .select("sort_order")
    .eq("category", data.category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { data: entry, error } = await supabase
    .from("help_entries")
    .insert({
      title: data.title,
      slug,
      content: data.content,
      category: data.category,
      is_published: data.is_published ?? true,
      sort_order: nextOrder,
      preview: data.preview ?? null,
      language_codes: data.language_codes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating help entry:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/help");
  revalidatePath("/help");
  return { success: true, entry };
}

export async function updateHelpEntry(
  id: string,
  data: {
    title?: string;
    slug?: string;
    content?: string;
    category?: string;
    is_published?: boolean;
    sort_order?: number;
    preview?: string | null;
    language_codes?: string[] | null;
  }
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("help_entries")
    .update(data)
    .eq("id", id);

  if (error) {
    console.error("Error updating help entry:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/help");
  revalidatePath("/help");
  return { success: true };
}

export async function deleteHelpEntry(id: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("help_entries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting help entry:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/help");
  revalidatePath("/help");
  return { success: true };
}

export async function toggleHelpEntryPublished(id: string, isPublished: boolean) {
  return updateHelpEntry(id, { is_published: isPublished });
}

// ============================================================================
// Category operations
// ============================================================================

/**
 * Rename a category — updates all entries with the old name.
 */
export async function renameHelpCategory(oldName: string, newName: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("help_entries")
    .update({ category: newName })
    .eq("category", oldName);

  if (error) {
    console.error("Error renaming help category:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/help");
  revalidatePath("/help");
  return { success: true };
}

/**
 * Delete a category — reassigns all its entries to the target category.
 */
export async function deleteHelpCategory(categoryName: string, reassignTo: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("help_entries")
    .update({ category: reassignTo })
    .eq("category", categoryName);

  if (error) {
    console.error("Error deleting help category:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/help");
  revalidatePath("/help");
  return { success: true };
}
