"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface AvatarUploadResult {
  success: boolean;
  error: string | null;
  avatarUrl?: string;
}

/**
 * Upload a user avatar to Supabase Storage
 * @param formData - FormData containing the file
 * @returns Result with avatar URL or error
 */
export async function uploadAvatar(
  formData: FormData
): Promise<AvatarUploadResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const file = formData.get("avatar") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
    };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      success: false,
      error: "File too large. Maximum size is 5MB.",
    };
  }

  try {
    // Generate a unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    // Delete old avatar if it exists
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    // Update user's avatar_url in database
    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating avatar URL:", updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath("/profile");
    revalidatePath("/settings");
    return { success: true, error: null, avatarUrl: publicUrl };
  } catch (error) {
    console.error("Unexpected error uploading avatar:", error);
    return {
      success: false,
      error: "An unexpected error occurred while uploading the avatar.",
    };
  }
}

/**
 * Remove user avatar
 */
export async function removeAvatar(): Promise<AvatarUploadResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Delete avatar from storage
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    // Update user's avatar_url in database
    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error removing avatar URL:", updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath("/profile");
    revalidatePath("/settings");
    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error removing avatar:", error);
    return {
      success: false,
      error: "An unexpected error occurred while removing the avatar.",
    };
  }
}
