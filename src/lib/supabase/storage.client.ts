/**
 * Client-side Supabase Storage utilities for admin file uploads
 * This version uses the browser client and is safe to use in client components
 */

import { createClient } from "./client";

export type StorageBucket = "word-images" | "audio";
export type EntityType = "languages" | "words" | "sentences";

export interface UploadResult {
  url: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Generate a structured storage path
 * Pattern: {entityType}/{entityId}/{fileName}
 */
function generatePath(
  entityType: EntityType,
  entityId: string,
  fileName: string
): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${entityType}/${entityId}/${sanitized}`;
}

/**
 * Get file extension from File object
 */
function getExtension(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : "";
}

/**
 * Downscale to max 1000px wide and re-encode as WebP @ q=0.85.
 * Used for word-image uploads. Returns the original file if anything fails
 * (so uploads never get blocked by an unexpected decode error).
 */
async function processWordImage(file: File): Promise<File> {
  const MAX_WIDTH = 1000;
  const QUALITY = 0.85;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = bitmap.width > MAX_WIDTH ? MAX_WIDTH / bitmap.width : 1;
    const targetWidth = Math.round(bitmap.width * scale);
    const targetHeight = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", QUALITY)
    );
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } catch (err) {
    console.warn("processWordImage: falling back to original file", err);
    return file;
  }
}

/**
 * Upload a file to Supabase Storage (client-side version)
 * 
 * @param bucket - "word-images" or "audio"
 * @param file - The file to upload
 * @param entityType - Type of entity (languages, words, sentences)
 * @param entityId - UUID of the entity
 * @param fileType - Descriptive name for the file (e.g., "trigger", "english", "foreign")
 * @returns Upload result with public URL or error
 */
export async function uploadFileClient(
  bucket: StorageBucket,
  file: File,
  entityType: EntityType,
  entityId: string,
  fileType: string
): Promise<UploadResult> {
  const supabase = createClient();

  // Auto-resize + re-encode word images to WebP @ max 1000px wide.
  const fileToUpload =
    bucket === "word-images" && file.type.startsWith("image/")
      ? await processWordImage(file)
      : file;

  // Generate unique filename with original extension
  const extension = getExtension(fileToUpload);
  const fileName = `${fileType}${extension}`;
  const path = generatePath(entityType, entityId, fileName);

  // Upload file (upsert to allow replacing)
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, fileToUpload, {
      upsert: true,
      contentType: fileToUpload.type,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return {
      url: null,
      path: null,
      error: uploadError.message,
    };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path,
    error: null,
  };
}
