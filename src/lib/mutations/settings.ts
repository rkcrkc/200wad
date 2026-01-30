"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================
// Types
// ============================================

export interface UpdateProfileData {
  name?: string;
  username?: string;
  bio?: string;
  website?: string;
  hometown?: string;
  location?: string;
  nationalities?: string[];
  wordsPerDay?: number;
}

export interface MutationResult {
  success: boolean;
  error: string | null;
}

// ============================================
// Profile Mutations
// ============================================

export async function updateProfile(
  data: UpdateProfileData
): Promise<MutationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Transform camelCase to snake_case for database
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.hometown !== undefined) updateData.hometown = data.hometown;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.nationalities !== undefined)
    updateData.nationalities = data.nationalities;
  if (data.wordsPerDay !== undefined)
    updateData.words_per_day = data.wordsPerDay;

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true, error: null };
}

// ============================================
// Password Mutations
// ============================================

export async function updatePassword(
  newPassword: string
): Promise<MutationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Error updating password:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function verifyCurrentPassword(
  email: string,
  currentPassword: string
): Promise<MutationResult> {
  const supabase = await createClient();

  // Attempt to sign in with current credentials to verify
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (error) {
    return { success: false, error: "Current password is incorrect" };
  }

  return { success: true, error: null };
}

// ============================================
// Security Mutations
// ============================================

export async function toggleTwoFactor(
  enabled: boolean
): Promise<MutationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("users")
    .update({ two_factor_enabled: enabled })
    .eq("id", user.id);

  if (error) {
    console.error("Error toggling 2FA:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true, error: null };
}

// ============================================
// Language Mutations
// ============================================

export async function setCurrentLanguage(
  languageId: string
): Promise<MutationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // First, set all user languages to not current
  const { error: resetError } = await supabase
    .from("user_languages")
    .update({ is_current: false })
    .eq("user_id", user.id);

  if (resetError) {
    console.error("Error resetting current language:", resetError);
    return { success: false, error: resetError.message };
  }

  // Then set the selected language as current
  const { error: setError } = await supabase
    .from("user_languages")
    .update({ is_current: true })
    .eq("user_id", user.id)
    .eq("language_id", languageId);

  if (setError) {
    console.error("Error setting current language:", setError);
    return { success: false, error: setError.message };
  }

  // Also update the quick-access cache in users table
  const { error: userError } = await supabase
    .from("users")
    .update({ current_language_id: languageId })
    .eq("id", user.id);

  if (userError) {
    console.error("Error updating user current language:", userError);
    // Non-fatal, the user_languages table is the source of truth
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, error: null };
}

export async function removeLanguage(
  languageId: string
): Promise<MutationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if this is the only language
  const { data: userLanguages, error: countError } = await supabase
    .from("user_languages")
    .select("id, is_current")
    .eq("user_id", user.id);

  if (countError) {
    console.error("Error counting languages:", countError);
    return { success: false, error: countError.message };
  }

  if (!userLanguages || userLanguages.length <= 1) {
    return {
      success: false,
      error: "Cannot remove your only language. Add another language first.",
    };
  }

  // Check if this is the current language
  const languageToRemove = userLanguages.find(
    (ul) =>
      ul.id ===
      userLanguages.find(
        (l) =>
          l.is_current &&
          userLanguages.some((ul2) => ul2.id === l.id && ul2.is_current)
      )?.id
  );

  // Remove the language
  const { error: deleteError } = await supabase
    .from("user_languages")
    .delete()
    .eq("user_id", user.id)
    .eq("language_id", languageId);

  if (deleteError) {
    console.error("Error removing language:", deleteError);
    return { success: false, error: deleteError.message };
  }

  // If we removed the current language, set another one as current
  const { data: wasCurrentLang } = await supabase
    .from("user_languages")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .single();

  if (!wasCurrentLang) {
    // No current language, set the first available one
    const { data: remainingLangs } = await supabase
      .from("user_languages")
      .select("language_id")
      .eq("user_id", user.id)
      .limit(1);

    if (remainingLangs && remainingLangs.length > 0 && remainingLangs[0].language_id) {
      await setCurrentLanguage(remainingLangs[0].language_id);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, error: null };
}

export async function addLanguage(languageId: string): Promise<MutationResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if already added
  const { data: existing } = await supabase
    .from("user_languages")
    .select("id")
    .eq("user_id", user.id)
    .eq("language_id", languageId)
    .single();

  if (existing) {
    return { success: false, error: "Language already added" };
  }

  // Check if this is the first language (should be set as current)
  const { data: userLanguages } = await supabase
    .from("user_languages")
    .select("id")
    .eq("user_id", user.id);

  const isFirst = !userLanguages || userLanguages.length === 0;

  const { error } = await supabase.from("user_languages").insert({
    user_id: user.id,
    language_id: languageId,
    is_current: isFirst,
  });

  if (error) {
    console.error("Error adding language:", error);
    return { success: false, error: error.message };
  }

  if (isFirst) {
    // Also update users table cache
    await supabase
      .from("users")
      .update({ current_language_id: languageId })
      .eq("id", user.id);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, error: null };
}
