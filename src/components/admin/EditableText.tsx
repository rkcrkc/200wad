"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  field: string;
  wordId: string;
  isEditMode: boolean;
  onSave: (field: string, value: string) => Promise<boolean>;
  className?: string;
  inputClassName?: string;
  /** Render as multiline textarea */
  multiline?: boolean;
}

export function EditableText({
  value,
  field,
  wordId,
  isEditMode,
  onSave,
  className,
  inputClassName,
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const justStartedRef = useRef(false);

  // Reset edit value when value prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Set flag to skip first blur event
      justStartedRef.current = true;
      inputRef.current.focus();
      inputRef.current.select();
      // Clear flag after a short delay
      setTimeout(() => {
        justStartedRef.current = false;
      }, 200);
    }
  }, [isEditing]);

  // Close editing when edit mode is turned off
  useEffect(() => {
    if (!isEditMode) {
      setIsEditing(false);
      setEditValue(value);
    }
  }, [isEditMode, value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onSave(field, editValue);
    setIsSaving(false);

    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Not in edit mode - show plain text
  if (!isEditMode) {
    return <span className={className}>{value}</span>;
  }

  // In edit mode but not actively editing - show text with edit button
  if (!isEditing) {
    return (
      <span className={cn("group inline-flex items-center gap-2", className)}>
        {value}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsEditing(true);
          }}
          className="rounded p-1 opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100"
          title={`Edit ${field}`}
        >
          <Pencil className="h-3.5 w-3.5 text-primary" />
        </button>
      </span>
    );
  }

  // Actively editing
  const InputComponent = multiline ? "textarea" : "input";

  return (
    <span className="inline-flex items-center gap-2">
      <InputComponent
        ref={inputRef as any}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Skip blur if we just started editing (prevents immediate close)
          if (justStartedRef.current) return;
          // Small delay to allow button clicks to register
          setTimeout(() => {
            if (!isSaving) handleCancel();
          }, 150);
        }}
        disabled={isSaving}
        className={cn(
          "rounded-md border border-primary/30 bg-white px-2 py-1 text-inherit focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
          multiline && "min-h-[80px] resize-y",
          inputClassName
        )}
        rows={multiline ? 3 : undefined}
      />
      <div className="flex items-center gap-1">
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <>
            <button
              onClick={handleSave}
              className="rounded p-1 text-success hover:bg-success/10"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="rounded p-1 text-destructive hover:bg-destructive/10"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </span>
  );
}
