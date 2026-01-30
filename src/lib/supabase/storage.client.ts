/**
 * Client-side Supabase Storage utilities for admin file uploads
 * This version uses the browser client and is safe to use in client components
 */

import { createClient } from "./client";

export type StorageBucket = "images" | "audio";
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
 * Upload a file to Supabase Storage (client-side version)
 * 
 * @param bucket - "images" or "audio"
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
  
  // Generate unique filename with original extension
  const extension = getExtension(file);
  const fileName = `${fileType}${extension}`;
  const path = generatePath(entityType, entityId, fileName);

  // Upload file (upsert to allow replacing)
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
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
