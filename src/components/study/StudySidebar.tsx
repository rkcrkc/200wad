"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { ExampleSentence, Word } from "@/types/database";
import { cn } from "@/lib/utils";

interface StudySidebarProps {
  /** Current word ID - used to detect word changes and reset local state */
  wordId: string;
  systemNotes: string | null;
  userNotes: string | null;
  exampleSentences: ExampleSentence[];
  relatedWords: Pick<Word, "id" | "english" | "headword" | "memory_trigger_image_url">[];
  isEnabled: boolean;
  onUserNotesChange: (notes: string | null) => void;
}

export function StudySidebar({
  wordId,
  systemNotes,
  userNotes,
  exampleSentences,
  relatedWords,
  isEnabled,
  onUserNotesChange,
}: StudySidebarProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState(userNotes || "");
  // Track locally saved notes to display immediately (before parent state updates)
  const [savedNotes, setSavedNotes] = useState<string | null>(null);
  const prevWordIdRef = useRef(wordId);

  // Reset all local state when word changes
  useEffect(() => {
    if (wordId !== prevWordIdRef.current) {
      setNotesInput(userNotes || "");
      setIsEditingNotes(false);
      setSavedNotes(null);
      prevWordIdRef.current = wordId;
    }
  }, [wordId, userNotes]);

  const handleSaveNotes = () => {
    const trimmedNotes = notesInput.trim() || null;
    setSavedNotes(trimmedNotes); // Save locally for immediate display
    onUserNotesChange(trimmedNotes); // Notify parent
    setIsEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setNotesInput(savedNotes ?? userNotes ?? "");
    setIsEditingNotes(false);
  };

  // Display notes: prefer locally saved (most recent), then prop from parent
  const displayNotes = savedNotes ?? userNotes;

  const cardClasses = cn(
    "w-full rounded-2xl bg-white shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)] transition-opacity",
    !isEnabled && "pointer-events-none opacity-30"
  );

  // Skeleton card for disabled state with shimmer animation
  if (!isEnabled) {
    return (
      <div className="flex flex-col gap-6">
        {/* Notes skeleton */}
        <div className={cardClasses}>
          <div className="p-6">
            <div className="mb-5 h-3 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-20 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>

        {/* Example sentences skeleton */}
        <div className={cardClasses}>
          <div className="p-6">
            <div className="mb-5 h-3 w-36 animate-pulse rounded bg-gray-200" />
            <div className="space-y-4">
              <div className="h-16 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-16 w-full animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>

        {/* Related words skeleton */}
        <div className={cardClasses}>
          <div className="p-6">
            <div className="mb-5 h-3 w-28 animate-pulse rounded bg-gray-200" />
            <div className="h-16 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Notes Card */}
      <div className={cardClasses}>
        <div className="flex flex-col gap-5 p-6">
          <span className="study-card-label uppercase tracking-wide text-foreground/50">
            NOTES
          </span>

          <div className="flex flex-col gap-5">
            {/* System notes */}
            {systemNotes && (
              <p className="text-small-regular text-foreground whitespace-pre-wrap">{systemNotes}</p>
            )}

            {(systemNotes || displayNotes || isEditingNotes) && (
              <div className="h-px w-full bg-black/10" />
            )}

            {/* User notes section */}
            {isEditingNotes ? (
              <div className="flex flex-col gap-3">
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      handleSaveNotes();
                    }
                  }}
                  placeholder="Add your notes here..."
                  className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 p-3 text-small-regular focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="rounded-lg bg-primary px-3 py-1.5 text-small-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelNotes}
                    className="rounded-lg px-3 py-1.5 text-small-semibold text-foreground/50 transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : displayNotes ? (
              <button
                onClick={() => {
                  setNotesInput(displayNotes);
                  setIsEditingNotes(true);
                }}
                className="w-full cursor-pointer text-left text-small-regular text-foreground whitespace-pre-wrap transition-colors hover:text-foreground/70"
              >
                {displayNotes}
              </button>
            ) : (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="self-start text-small-regular text-foreground/50 transition-colors hover:text-foreground"
              >
                + Add notes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Example Sentences Card */}
      {exampleSentences.length > 0 && (
        <div className={cardClasses}>
          <div className="flex flex-col gap-5 p-6">
          <span className="study-card-label uppercase tracking-wide text-foreground/50">
            EXAMPLE SENTENCES
          </span>

            <div className="flex flex-col gap-5">
              {exampleSentences.map((sentence, index) => (
                <div key={sentence.id}>
                  <button className="flex w-full items-start gap-5 text-left transition-opacity hover:opacity-70">
                    {sentence.thumbnail_image_url && (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={sentence.thumbnail_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="text-small-regular text-foreground">
                        {sentence.foreign_sentence}
                      </p>
                      <p className="text-small-regular text-foreground/60">
                        {sentence.english_sentence}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-foreground/50" />
                  </button>
                  {index < exampleSentences.length - 1 && (
                    <div className="mt-5 h-px w-full bg-black/10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Related Words Card */}
      {relatedWords.length > 0 && (
        <div className={cardClasses}>
          <div className="flex flex-col gap-5 p-6">
          <span className="study-card-label uppercase tracking-wide text-foreground/50">
            RELATED WORDS
          </span>

            <div className="flex flex-col gap-5">
              {relatedWords.map((word, index) => (
                <div key={word.id}>
                  <button className="flex w-full items-center gap-5 text-left transition-opacity hover:opacity-70">
                    {word.memory_trigger_image_url ? (
                      <div className="relative h-[62px] w-[62px] shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={word.memory_trigger_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="62px"
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-lg border border-black/10" />
                      </div>
                    ) : (
                      <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                        🗣️
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="text-small-regular text-foreground">
                        {word.english}
                      </p>
                      <p className="text-small-regular text-foreground/60">
                        {word.headword}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-foreground/50" />
                  </button>
                  {index < relatedWords.length - 1 && (
                    <div className="mt-5 h-px w-full bg-black/10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
