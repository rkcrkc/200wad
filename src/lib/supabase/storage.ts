/**
 * Supabase Storage utilities for admin file uploads
 * Handles images and audio files with structured path strategy
 */

import { createClient } from "./server";

export type StorageBucket = "images" | "audio";
export type EntityType = "languages" | "words" | "sentences";

export interface UploadResult {
  url: string | null;
  path: string | null;
  error: string | null;
}

export interface DeleteResult {
  success: boolean;
  error: string | null;
}

/**
 * Generate a structured storage path
 * Pattern: {entityType}/{entityId}/{fileName}
 * 
 * Examples:
 * - images/words/abc123/trigger.jpg
 * - audio/words/abc123/english.mp3
 */
function generatePath(
  entityType: EntityType,
  entityId: string,
  fileName: string
): string {
  // Sanitize filename - keep extension, replace unsafe chars
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
 * Upload a file to Supabase Storage
 * 
 * @param bucket - "images" or "audio"
 * @param file - The file to upload
 * @param entityType - Type of entity (languages, words, sentences)
 * @param entityId - UUID of the entity
 * @param fileType - Descriptive name for the file (e.g., "trigger", "english", "foreign")
 * @returns Upload result with public URL or error
 */
export async function uploadFile(
  bucket: StorageBucket,
  file: File,
  entityType: EntityType,
  entityId: string,
  fileType: string
): Promise<UploadResult> {
  const supabase = await createClient();
  
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

/**
 * Delete a file from Supabase Storage
 * 
 * @param bucket - "images" or "audio"
 * @param path - Full path to the file (e.g., "words/abc123/trigger.jpg")
 * @returns Delete result
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<DeleteResult> {
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error("Storage delete error:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Delete all files for an entity
 * Useful when deleting a word or sentence with multiple files
 * 
 * @param bucket - "images" or "audio"
 * @param entityType - Type of entity
 * @param entityId - UUID of the entity
 * @returns Delete result
 */
export async function deleteEntityFiles(
  bucket: StorageBucket,
  entityType: EntityType,
  entityId: string
): Promise<DeleteResult> {
  const supabase = await createClient();
  const prefix = `${entityType}/${entityId}/`;

  // List all files in the entity folder
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(`${entityType}/${entityId}`);

  if (listError) {
    console.error("Storage list error:", listError);
    return {
      success: false,
      error: listError.message,
    };
  }

  if (!files || files.length === 0) {
    return { success: true, error: null };
  }

  // Delete all files
  const paths = files.map((f) => `${prefix}${f.name}`);
  const { error: deleteError } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (deleteError) {
    console.error("Storage delete error:", deleteError);
    return {
      success: false,
      error: deleteError.message,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Extract the storage path from a public URL
 * Useful when you have the URL and need to delete the file
 */
export function getPathFromUrl(url: string, bucket: StorageBucket): string | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(new RegExp(`/storage/v1/object/public/${bucket}/(.+)`));
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}
