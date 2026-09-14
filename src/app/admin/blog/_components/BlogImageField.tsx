"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, ImageIcon } from "lucide-react";
import { uploadFileClient } from "@/lib/supabase/storage.client";
import { cn } from "@/lib/utils";

interface BlogImageFieldProps {
  /** Current public URL of the stored image, if any. */
  value: string | null;
  /** Which entity the image belongs to — drives the storage path. */
  entityType: "posts" | "authors";
  /** Entity id; when null, upload is disabled (draft-first: save first). */
  entityId: string | null;
  /** Descriptive file stem, e.g. "cover" or "avatar". */
  fileType: string;
  /** Fired with the new public URL once an upload succeeds. */
  onUploaded: (url: string) => void;
  /** Square preview for avatars, wide banner for covers. */
  shape?: "wide" | "square";
  /** Shown when upload is disabled because the entity isn't saved yet. */
  disabledHint?: string;
}

export function BlogImageField({
  value,
  entityType,
  entityId,
  fileType,
  onUploaded,
  shape = "wide",
  disabledHint = "Save first to enable image upload.",
}: BlogImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !entityId;

  const handleFile = async (file: File) => {
    if (!entityId) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const res = await uploadFileClient(
        "blog-images",
        file,
        entityType,
        entityId,
        fileType
      );
      if (res.error || !res.url) {
        setError(res.error ?? "Upload failed. Try again.");
        return;
      }
      // Cache-bust so the <img> re-fetches after an upsert to the same path.
      onUploaded(`${res.url}?t=${Date.now()}`);
    } catch (err) {
      console.error("BlogImageField upload threw:", err);
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "group relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed bg-gray-50 transition-colors",
          shape === "square" ? "aspect-square w-32" : "aspect-[16/9] w-full",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer border-gray-300 hover:border-gray-400",
          dragging && "border-primary ring-2 ring-primary/20"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onInputChange}
          className="hidden"
          disabled={disabled}
        />

        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {/* Overlay */}
        {!disabled && (
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 transition-opacity",
              uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-white" />
                <span className="text-xs font-medium text-white">Uploading…</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow">
                <Upload className="h-3.5 w-3.5" />
                {value ? "Replace" : "Upload"}
              </span>
            )}
          </div>
        )}
      </div>

      {disabled && <p className="mt-1.5 text-xs text-gray-500">{disabledHint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
