"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableArrayFieldProps {
  value: string[];
  field: string;
  wordId: string;
  isEditMode: boolean;
  onSave: (field: string, value: string[]) => Promise<boolean>;
  label: string;
  className?: string;
}

export function EditableArrayField({
  value,
  field,
  wordId,
  isEditMode,
  onSave,
  label,
  className,
}: EditableArrayFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const justStartedRef = useRef(false);

  // Reset edit value when value prop changes
  useEffect(() => {
    setEditValue(value.join(", "));
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      justStartedRef.current = true;
      inputRef.current.focus();
      setTimeout(() => {
        justStartedRef.current = false;
      }, 200);
    }
  }, [isEditing]);

  // Close editing when edit mode is turned off
  useEffect(() => {
    if (!isEditMode) {
      setIsEditing(false);
      setEditValue(value.join(", "));
    }
  }, [isEditMode, value]);

  const parseArray = (text: string): string[] => {
    return text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleSave = async () => {
    const newValue = parseArray(editValue);
    const unchanged =
      newValue.length === value.length &&
      newValue.every((v, i) => v === value[i]);

    if (unchanged) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onSave(field, newValue);
    setIsSaving(false);

    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value.join(", "));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isEditMode) {
    return null;
  }

  const displayText = value.length > 0 ? value.join(", ") : "(none)";

  if (!isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-xs-medium text-muted-foreground">{label}:</span>
        <span className="group inline-flex items-center gap-1.5 text-sm text-foreground/70">
          {displayText}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsEditing(true);
            }}
            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100"
            title={`Edit ${label}`}
          >
            <Pencil className="h-3 w-3 text-primary" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs-medium text-muted-foreground">{label}:</span>
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (justStartedRef.current) return;
          setTimeout(() => {
            if (!isSaving) handleCancel();
          }, 150);
        }}
        disabled={isSaving}
        placeholder="Comma-separated answers"
        className="min-w-[200px] flex-1 rounded-md border border-primary/30 bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex items-center gap-1">
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <>
            <button
              onClick={handleSave}
              className="rounded p-0.5 text-success hover:bg-success/10"
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="rounded p-0.5 text-destructive hover:bg-destructive/10"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
