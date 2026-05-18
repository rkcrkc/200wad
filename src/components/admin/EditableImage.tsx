"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableImageProps {
  src: string | null;
  alt: string;
  field: string;
  wordId: string;
  isEditMode: boolean;
  onUpload: (field: string, file: File) => Promise<boolean>;
  className?: string;
  imageClassName?: string;
  /** Height of the image container */
  height?: number;
}

export function EditableImage({
  src,
  alt,
  field,
  wordId,
  isEditMode,
  onUpload,
  className,
  imageClassName,
  height = 400,
}: EditableImageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    let ok = false;
    try {
      ok = await onUpload(field, file);
    } catch (err) {
      console.error("EditableImage upload threw:", err);
      ok = false;
    }
    setIsUploading(false);
    if (!ok) {
      setUploadError("Upload failed. Check console for details and try again.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Not in edit mode - show plain image
  if (!isEditMode) {
    if (!src) {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-lg bg-gray-50",
            className
          )}
          style={{ height }}
        >
          <span className="text-6xl">🖼️</span>
        </div>
      );
    }

    return (
      <div
        className={cn("relative overflow-hidden rounded-lg", className)}
        style={{ height }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className={cn("object-contain", imageClassName)}
          sizes="(max-width: 768px) 100vw, 730px"
        />
      </div>
    );
  }

  // Edit mode - show image with upload overlay
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg",
        isDragging && "ring-2 ring-primary ring-offset-2",
        className
      )}
      style={{ height }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Image or placeholder */}
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn("object-contain", imageClassName)}
          sizes="(max-width: 768px) 100vw, 730px"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gray-50">
          <span className="text-6xl">🖼️</span>
        </div>
      )}

      {/* Upload overlay - visible on hover, when dragging, or when an error is shown */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 transition-opacity",
          isDragging || isUploading || uploadError
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <span className="text-sm font-medium text-white">Uploading...</span>
          </>
        ) : (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              {src ? "Replace image" : "Upload image"}
            </button>
            <span className="text-xs text-white/80">or drag and drop</span>
            {uploadError && (
              <span className="max-w-[80%] rounded bg-destructive px-2 py-1 text-center text-xs font-medium text-white">
                {uploadError}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
