"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import {
  createLanguageSchema,
  updateLanguageSchema,
  type CreateLanguageInput,
  type UpdateLanguageInput,
} from "@/lib/validations/admin";
import { revalidatePath } from "next/cache";

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface MutationResult {
  success: boolean;
  error: string | null;
}

export interface CreateLanguageResult extends MutationResult {
  id: string | null;
}

// ============================================================================
// CREATE LANGUAGE
// ============================================================================

export async function createLanguage(
  input: CreateLanguageInput
): Promise<CreateLanguageResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = createLanguageSchema.parse(input);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("languages")
      .insert({
        name: validated.name,
        native_name: validated.native_name,
        code: validated.code,
        sort_order: validated.sort_order ?? 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating language:", error);
      return { success: false, id: null, error: error.message };
    }

    revalidatePath("/admin/languages");
    revalidatePath("/dashboard");

    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

// ============================================================================
// UPDATE LANGUAGE
// ============================================================================

export async function updateLanguage(
  id: string,
  input: UpdateLanguageInput
): Promise<MutationResult> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = updateLanguageSchema.parse(input);

    const supabase = await createClient();

    const { error } = await supabase
      .from("languages")
      .update({
        ...validated,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating language:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/languages");
    revalidatePath("/dashboard");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// DELETE LANGUAGE
// ============================================================================

export async function deleteLanguage(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Check for dependent courses
    const { count } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("language_id", id);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete language with ${count} course(s). Delete courses first.`,
      };
    }

    const { error } = await supabase.from("languages").delete().eq("id", id);

    if (error) {
      console.error("Error deleting language:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/languages");
    revalidatePath("/dashboard");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// REORDER LANGUAGES
// ============================================================================

export async function reorderLanguages(
  orderedIds: string[]
): Promise<MutationResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Update each language's sort_order
    const updates = orderedIds.map((id, index) =>
      supabase.from("languages").update({ sort_order: index }).eq("id", id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error);

    if (firstError?.error) {
      console.error("Error reordering languages:", firstError.error);
      return { success: false, error: firstError.error.message };
    }

    revalidatePath("/admin/languages");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
