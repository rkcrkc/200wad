"use client";

import { useRef, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { EditableImage } from "@/components/admin";
import { ConfirmModal } from "@/components/admin/AdminModal";
import type { WordImageContext } from "@/lib/mutations/admin/imageGroups";

interface MemoryTriggerImageEditorProps {
  wordId: string;
  /** The effective image the learner currently sees for this word. */
  effectiveImageUrl: string | null;
  /** Group/override context; null while loading. */
  context: WordImageContext | null;
  /** Set this word's own picture (override). */
  onWordUpload: (file: File) => Promise<boolean>;
  /** Replace the shared concept picture for the whole group (fans out). */
  onConceptUpload: (file: File) => Promise<boolean>;
  /** Clear this word's override so it re-inherits the concept picture. */
  onReset: () => Promise<boolean>;
}

const TILE_HEIGHT = 240;

/**
 * Admin-only, in-context image editor for the memory-trigger picture. Shows two
 * controls when the word belongs to a concept group:
 *  - "This word" → sets a per-word override (only this word).
 *  - "Concept · shared by N words" → replaces the group master (all members).
 * One-off words (no group) get a single full-width "This word" control.
 */
export function MemoryTriggerImageEditor({
  wordId,
  effectiveImageUrl,
  context,
  onWordUpload,
  onConceptUpload,
  onReset,
}: MemoryTriggerImageEditorProps) {
  const [isResetting, setIsResetting] = useState(false);

  // Concept edits fan out to every member word, so gate the save behind a
  // confirmation. The selected file is stashed until the admin confirms; the
  // EditableImage's onUpload promise stays pending until then.
  const [pendingConceptFile, setPendingConceptFile] = useState<File | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const conceptResolveRef = useRef<((ok: boolean) => void) | null>(null);

  const inGroup = !!context?.imageGroupId;
  const hasOverride = !!context?.imageOverrideUrl;

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await onReset();
    } finally {
      setIsResetting(false);
    }
  };

  // Stash the file and open the confirm dialog; resolve EditableImage's promise
  // only once the admin confirms (with the save result) or cancels (benign).
  const requestConceptUpload = (file: File): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      conceptResolveRef.current = resolve;
      setPendingConceptFile(file);
    });

  const handleConceptConfirm = async () => {
    if (!pendingConceptFile) return;
    setIsConfirming(true);
    const ok = await onConceptUpload(pendingConceptFile);
    setIsConfirming(false);
    conceptResolveRef.current?.(ok);
    conceptResolveRef.current = null;
    setPendingConceptFile(null);
  };

  const handleConceptCancel = () => {
    if (isConfirming) return;
    // Resolve truthy so EditableImage treats a cancel as a no-op, not an error.
    conceptResolveRef.current?.(true);
    conceptResolveRef.current = null;
    setPendingConceptFile(null);
  };

  const memberCount = context?.memberCount ?? 0;

  // One-off word (or context not yet loaded): single full-width control.
  if (!inGroup) {
    return (
      <EditableImage
        src={effectiveImageUrl}
        alt="Memory trigger"
        field="word"
        wordId={wordId}
        isEditMode
        onUpload={(_field, file) => onWordUpload(file)}
        height={400}
        className="w-full"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* This word's picture (override) */}
      <div className="space-y-2">
        <p className="text-small-semibold text-foreground">This word</p>
        <EditableImage
          src={effectiveImageUrl}
          alt="This word's picture"
          field="word"
          wordId={wordId}
          isEditMode
          onUpload={(_field, file) => onWordUpload(file)}
          height={TILE_HEIGHT}
          className="w-full"
        />
        {hasOverride ? (
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 text-xs-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
          >
            {isResetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Reset to concept pic
          </button>
        ) : (
          <p className="text-xs-medium text-muted-foreground">
            Inheriting the concept picture
          </p>
        )}
      </div>

      {/* Concept picture (group master) */}
      <div className="space-y-2">
        <p className="text-small-semibold text-foreground">
          Concept{context?.groupLabel ? ` · ${context.groupLabel}` : ""}
        </p>
        <EditableImage
          src={context?.masterImageUrl ?? null}
          alt="Concept picture"
          field="concept"
          wordId={wordId}
          isEditMode
          onUpload={(_field, file) => requestConceptUpload(file)}
          height={TILE_HEIGHT}
          className="w-full"
        />
        <p className="text-xs-medium text-muted-foreground">
          Shared by {memberCount} {memberCount === 1 ? "word" : "words"}
        </p>
      </div>

      <ConfirmModal
        isOpen={!!pendingConceptFile}
        onClose={handleConceptCancel}
        onConfirm={handleConceptConfirm}
        title="Replace the concept picture?"
        message={`This replaces the shared picture${
          context?.groupLabel ? ` for "${context.groupLabel}"` : ""
        } across all ${memberCount} ${
          memberCount === 1 ? "word" : "words"
        } that use it. Words with their own override won't change.`}
        confirmLabel="Replace concept pic"
        isLoading={isConfirming}
      />
    </div>
  );
}
