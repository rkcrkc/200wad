"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminAudioUploadProps {
  label: string;
  value: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

export function AdminAudioUpload({
  label,
  value,
  onChange,
  accept = "audio/*",
  className,
  disabled,
}: AdminAudioUploadProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync previewUrl with value prop when editing different items
  useEffect(() => {
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

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const handleFile = (file: File) => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setLocalFile(file);
    onChange(file, url);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setLocalFile(null);
    onChange(null, null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setMenuOpen(false);
  };

  const triggerUpload = () => {
    inputRef.current?.click();
    setMenuOpen(false);
  };

  const displayUrl = previewUrl || value;
  const hasAudio = !!displayUrl;

  return (
    <div className={cn("relative", className)}>
      {/* Header row: label + ellipsis menu */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {!disabled && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                {hasAudio ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Audio
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={triggerUpload}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Audio
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {hasAudio ? (
        <audio controls src={displayUrl} className="w-full" />
      ) : (
        <button
          type="button"
          onClick={triggerUpload}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-700",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Upload className="h-4 w-4" />
          Upload Audio
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
