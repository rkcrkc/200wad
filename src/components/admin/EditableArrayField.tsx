"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, Loader2, Plus } from "lucide-react";
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
  wordId: _wordId,
  isEditMode,
  onSave,
  label,
  className,
}: EditableArrayFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [pendingValues, setPendingValues] = useState<string[]>(value);
  const [newInput, setNewInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep pending values in sync when the underlying value changes
  // (e.g., after a successful save or external update) while not editing.
  useEffect(() => {
    if (!isEditing) {
      setPendingValues(value);
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Close editing when edit mode is turned off globally
  useEffect(() => {
    if (!isEditMode) {
      setIsEditing(false);
      setPendingValues(value);
      setNewInput("");
    }
  }, [isEditMode, value]);

  const addPendingChip = () => {
    const trimmed = newInput.trim();
    if (!trimmed) return;
    if (pendingValues.includes(trimmed)) {
      setNewInput("");
      return;
    }
    setPendingValues([...pendingValues, trimmed]);
    setNewInput("");
  };

  const removePendingChip = (index: number) => {
    setPendingValues(pendingValues.filter((_, i) => i !== index));
  };

  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  const handleSave = async () => {
    // Flush any unsubmitted text in the input
    const trimmed = newInput.trim();
    const finalValues =
      trimmed && !pendingValues.includes(trimmed)
        ? [...pendingValues, trimmed]
        : pendingValues;

    if (arraysEqual(finalValues, value)) {
      setIsEditing(false);
      setNewInput("");
      return;
    }

    setIsSaving(true);
    const success = await onSave(field, finalValues);
    setIsSaving(false);

    if (success) {
      setPendingValues(finalValues);
      setNewInput("");
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setPendingValues(value);
    setNewInput("");
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (newInput.trim()) {
        addPendingChip();
      } else {
        handleSave();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if (
      e.key === "Backspace" &&
      newInput === "" &&
      pendingValues.length > 0
    ) {
      // Convenience: backspace on empty input removes the last chip
      e.preventDefault();
      setPendingValues(pendingValues.slice(0, -1));
    }
  };

  if (!isEditMode) {
    return null;
  }

  // Display mode (not editing) — show chips + pencil
  if (!isEditing) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className="text-xs-medium text-muted-foreground">{label}:</span>
        <div className="group inline-flex flex-wrap items-center gap-1.5">
          {value.length === 0 ? (
            <span className="text-sm text-foreground/50">(none)</span>
          ) : (
            value.map((answer, index) => (
              <span
                key={`${answer}-${index}`}
                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-sm text-blue-700"
              >
                {answer}
              </span>
            ))
          )}
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
        </div>
      </div>
    );
  }

  // Edit mode — chips with remove, input to add, save/cancel
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs-medium text-muted-foreground">{label}:</span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5 rounded-md border border-primary/30 bg-white px-2 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        {pendingValues.map((answer, index) => (
          <span
            key={`${answer}-${index}`}
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-sm text-blue-700"
          >
            {answer}
            <button
              type="button"
              onClick={() => removePendingChip(index)}
              className="text-blue-400 transition-colors hover:text-red-500"
              title="Remove"
              disabled={isSaving}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={newInput}
          onChange={(e) => setNewInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={isSaving}
          placeholder={
            pendingValues.length === 0
              ? "Type an answer and press Enter"
              : "Add another…"
          }
          className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm placeholder:text-foreground/40 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-1">
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <>
            {newInput.trim() && (
              <button
                type="button"
                onClick={addPendingChip}
                className="rounded p-0.5 text-primary hover:bg-primary/10"
                title="Add answer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="rounded p-0.5 text-success hover:bg-success/10"
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
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
