"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioUploadButtonProps {
  /** Uploads the picked file; resolves true on success. */
  onUpload: (file: File) => Promise<boolean>;
  /** Icon size in px, to match the AudioButton it replaces. Defaults to 20. */
  size?: number;
}

type Status = "idle" | "uploading" | "success";

/**
 * Admin edit-mode replacement for the speaker icon: repurposes the audio slot
 * into an upload affordance. Upload-only (no preview/delete). Picks a file,
 * uploads immediately, and shows a brief "Audio uploaded" confirmation.
 */
export function AudioUploadButton({ onUpload, size = 20 }: AudioUploadButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again re-fires onChange.
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    setStatus("uploading");
    const ok = await onUpload(file);
    if (!ok) {
      setStatus("idle");
      return;
    }

    setStatus("success");
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
  };

  const icon =
    status === "uploading" ? (
      <Loader2
        className="animate-spin"
        style={{ width: size, height: size, color: "rgba(20, 21, 21, 0.5)" }}
      />
    ) : status === "success" ? (
      <Check style={{ width: size, height: size, color: "#00c950" }} />
    ) : (
      <Upload style={{ width: size, height: size, color: "#0b6cff" }} />
    );

  const open = () => {
    if (status !== "uploading") inputRef.current?.click();
  };

  // Rendered as a focusable span (not a <button>) because it lives inside the
  // word row's existing <button> wrapper; nested buttons are invalid DOM.
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span
        role="button"
        tabIndex={status === "uploading" ? -1 : 0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        title="Upload audio"
        aria-label="Upload audio"
        aria-disabled={status === "uploading"}
        className={cn(
          "flex items-center justify-center rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
          status === "idle" && "cursor-pointer hover:opacity-80",
          status === "uploading" && "cursor-not-allowed"
        )}
      >
        {icon}
      </span>
      {status === "success" && (
        <span className="text-xs-medium text-success">Audio uploaded</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={handleChange}
        className="hidden"
      />
    </span>
  );
}
