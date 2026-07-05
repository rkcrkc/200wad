/**
 * Client-side Supabase Storage utilities for admin file uploads
 * This version uses the browser client and is safe to use in client components
 */

import { createClient } from "./client";

export type StorageBucket = "word-images" | "audio" | "word-videos";
export type EntityType = "languages" | "words" | "sentences" | "image-groups";

/** Max size for a memory-trigger MP4 (mirrors the word-videos bucket file_size_limit). */
export const WORD_VIDEO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Client-side guard for trigger videos before upload. The word-videos bucket
 * also enforces mp4-only + the size cap at the platform layer; this just gives
 * a friendly error first.
 */
export function validateTriggerVideo(file: File): string | null {
  if (file.type !== "video/mp4") return "Please choose an MP4 video.";
  if (file.size > WORD_VIDEO_MAX_BYTES) return "Video must be under 5 MB.";
  return null;
}

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
 * Grab a poster/still from a trigger MP4 entirely in the browser (no ffmpeg):
 * decode one frame ~1s in (midpoint for very short clips) and re-encode it as
 * WebP with the SAME MAX_WIDTH/QUALITY/format as processWordImage. Used so a
 * single video upload also yields a matching thumbnail/fallback image.
 *
 * Resolves to `null` on any failure (unsupported decode, no frame, etc.) so the
 * caller can fall back to a manual still without blocking the video upload.
 */
export async function generatePosterFromVideo(file: File): Promise<File | null> {
  const MAX_WIDTH = 1000;
  const QUALITY = 0.85;

  return new Promise<File | null>((resolve) => {
    let settled = false;
    let objectUrl: string | null = null;

    const finish = (result: File | null) => {
      if (settled) return;
      settled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    try {
      objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      // Guard against a hung decode.
      const timeout = setTimeout(() => finish(null), 10000);

      const onSeeked = () => {
        clearTimeout(timeout);
        try {
          const scale =
            video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1;
          const w = Math.round(video.videoWidth * scale);
          const h = Math.round(video.videoHeight * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx || w === 0 || h === 0) {
            finish(null);
            return;
          }
          ctx.drawImage(video, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                finish(null);
                return;
              }
              const baseName = file.name.replace(/\.[^.]+$/, "") || "poster";
              finish(
                new File([blob], `${baseName}.webp`, { type: "image/webp" })
              );
            },
            "image/webp",
            QUALITY
          );
        } catch (err) {
          console.warn("generatePosterFromVideo: draw failed", err);
          finish(null);
        }
      };

      video.onloadedmetadata = () => {
        const dur = isFinite(video.duration) ? video.duration : 0;
        const target = Math.min(1, dur / 2);
        video.onseeked = onSeeked;
        try {
          video.currentTime = target;
        } catch {
          finish(null);
        }
      };
      video.onerror = () => finish(null);
      video.src = objectUrl;
    } catch (err) {
      console.warn("generatePosterFromVideo: setup failed", err);
      finish(null);
    }
  });
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
