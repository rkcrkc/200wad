"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminFileUploadProps {
  type: "image" | "audio";
  value: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

export function AdminFileUpload({
  type,
  value,
  onChange,
  accept,
  className,
  disabled,
}: AdminFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultAccept = type === "image" ? "image/*" : "audio/*";

  // Sync previewUrl with value prop when editing different items
  useEffect(() => {
    // Only update if we don't have a local file (i.e., the value is from the server)
    if (!localFile) {
      setPreviewUrl(value);
    }
  }, [value, localFile]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = (file: File) => {
    // Revoke previous blob URL if exists
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setLocalFile(file);
    onChange(file, url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    // Revoke blob URL if exists
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setLocalFile(null);
    onChange(null, null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || value;

  return (
    <div className={cn("relative", className)}>
      {displayUrl ? (
        <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
          {type === "image" ? (
            <div className="relative max-w-[500px] max-h-[500px] overflow-hidden rounded-lg bg-gray-100">
              <img
                src={displayUrl}
                alt="Preview"
                className="max-w-full max-h-[500px] object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Volume2 className="h-6 w-6 text-primary" />
              </div>
              <audio controls src={displayUrl} className="flex-1" />
            </div>
          )}
          {!disabled && (
            <button
              onClick={handleClear}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            {type === "image" ? (
              <ImageIcon className="h-6 w-6 text-gray-400" />
            ) : (
              <Volume2 className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <p className="mt-3 text-sm font-medium text-gray-700">
            Drop {type === "image" ? "an image" : "an audio file"} here
          </p>
          <p className="mt-1 text-xs text-gray-500">or click to browse</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept || defaultAccept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
