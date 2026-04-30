"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BodyTextEditor } from "./BodyTextEditor";

interface EditableBodyTextProps {
  value: string;
  field: string;
  wordId: string;
  isEditMode: boolean;
  onSave: (field: string, value: string) => Promise<boolean>;
  /** Wrapper className for the preview container. */
  className?: string;
  /** Custom preview renderer (e.g. parseFormattedText, ReactMarkdown). */
  renderPreview?: (value: string) => React.ReactNode;
  /** Placeholder for the editor when value is empty. */
  placeholder?: string;
  /** Number of rows for the textarea. */
  rows?: number;
  /** Class for the editing-state textarea. */
  textareaClassName?: string;
  /** Toolbar variant — "word" (single-gender) or "multi" (multi-gender). */
  variant?: "word" | "multi";
}

export function EditableBodyText({
  value,
  field,
  wordId: _wordId,
  isEditMode,
  onSave,
  className,
  renderPreview,
  placeholder,
  rows = 8,
  textareaClassName,
  variant,
}: EditableBodyTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const justStartedRef = useRef(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (!isEditMode) {
      setIsEditing(false);
      setEditValue(value);
    }
  }, [isEditMode, value]);

  useEffect(() => {
    if (isEditing) {
      justStartedRef.current = true;
      const t = window.setTimeout(() => {
        justStartedRef.current = false;
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const ok = await onSave(field, editValue);
    setIsSaving(false);
    if (ok) setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  // Not editable at all — show preview only
  if (!isEditMode) {
    return (
      <div className={className}>
        {renderPreview ? renderPreview(value) : value}
      </div>
    );
  }

  // Edit mode but not active — preview + edit affordance on hover
  if (!isEditing) {
    return (
      <div className={cn("group relative", className)}>
        {renderPreview ? renderPreview(value) : <p>{value}</p>}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsEditing(true);
          }}
          className="absolute right-0 top-0 rounded p-1 opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100"
          title={`Edit ${field}`}
        >
          <Pencil className="h-3.5 w-3.5 text-primary" />
        </button>
      </div>
    );
  }

  // Active editing — toolbar-enabled textarea + save/cancel
  return (
    <div className="flex flex-col gap-2">
      <BodyTextEditor
        value={editValue}
        onChange={setEditValue}
        rows={rows}
        placeholder={placeholder}
        textareaClassName={textareaClassName}
        variant={variant}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            handleCancel();
          }
        }}
      />
      <div className="flex items-center gap-1 self-end">
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <>
            <button
              type="button"
              onClick={handleSave}
              className="rounded p-1 text-success hover:bg-success/10"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded p-1 text-destructive hover:bg-destructive/10"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
