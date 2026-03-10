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
  /** Whether current user is an admin (can edit system notes) */
  isAdmin?: boolean;
  /** Callback when admin edits system notes */
  onSystemNotesChange?: (notes: string | null) => void;
}

export function StudySidebar({
  wordId,
  systemNotes,
  userNotes,
  exampleSentences,
  relatedWords,
  isEnabled,
  onUserNotesChange,
  isAdmin = false,
  onSystemNotesChange,
}: StudySidebarProps) {
  // User notes state
  const [isEditingUserNotes, setIsEditingUserNotes] = useState(false);
  const [userNotesInput, setUserNotesInput] = useState(userNotes || "");
  const [savedUserNotes, setSavedUserNotes] = useState<string | null>(null);

  // System notes state (admin only)
  const [isEditingSystemNotes, setIsEditingSystemNotes] = useState(false);
  const [systemNotesInput, setSystemNotesInput] = useState(systemNotes || "");
  const [savedSystemNotes, setSavedSystemNotes] = useState<string | null>(null);

  const prevWordIdRef = useRef(wordId);

  // Reset all local state when word changes
  useEffect(() => {
    if (wordId !== prevWordIdRef.current) {
      setUserNotesInput(userNotes || "");
      setIsEditingUserNotes(false);
      setSavedUserNotes(null);
      setSystemNotesInput(systemNotes || "");
      setIsEditingSystemNotes(false);
      setSavedSystemNotes(null);
      prevWordIdRef.current = wordId;
    }
  }, [wordId, userNotes, systemNotes]);

  // User notes handlers
  const handleSaveUserNotes = () => {
    const trimmedNotes = userNotesInput.trim() || null;
    setSavedUserNotes(trimmedNotes);
    onUserNotesChange(trimmedNotes);
    setIsEditingUserNotes(false);
  };

  const handleCancelUserNotes = () => {
    setUserNotesInput(savedUserNotes ?? userNotes ?? "");
    setIsEditingUserNotes(false);
  };

  // System notes handlers (admin only)
  const handleSaveSystemNotes = () => {
    const trimmedNotes = systemNotesInput.trim() || null;
    setSavedSystemNotes(trimmedNotes);
    onSystemNotesChange?.(trimmedNotes);
    setIsEditingSystemNotes(false);
  };

  const handleCancelSystemNotes = () => {
    setSystemNotesInput(savedSystemNotes ?? systemNotes ?? "");
    setIsEditingSystemNotes(false);
  };

  // Display notes: prefer locally saved (most recent), then prop from parent
  const displayUserNotes = savedUserNotes ?? userNotes;
  const displaySystemNotes = savedSystemNotes ?? systemNotes;

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
            {isEditingSystemNotes ? (
              <div className="flex flex-col gap-3">
                <textarea
                  value={systemNotesInput}
                  onChange={(e) => setSystemNotesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      handleSaveSystemNotes();
                    }
                  }}
                  placeholder="Add system notes..."
                  className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 p-3 text-small-regular focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSystemNotes}
                    className="rounded-lg bg-primary px-3 py-1.5 text-small-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelSystemNotes}
                    className="rounded-lg px-3 py-1.5 text-small-semibold text-foreground/50 transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : displaySystemNotes ? (
              <div className="flex flex-col gap-2">
                <p className="text-small-regular text-foreground whitespace-pre-wrap">{displaySystemNotes}</p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setSystemNotesInput(displaySystemNotes);
                      setIsEditingSystemNotes(true);
                    }}
                    className="self-start text-small-semibold text-foreground/50 transition-colors hover:text-foreground"
                  >
                    Edit
                  </button>
                )}
              </div>
            ) : isAdmin ? (
              <button
                onClick={() => setIsEditingSystemNotes(true)}
                className="self-start text-small-regular text-foreground/50 transition-colors hover:text-foreground"
              >
                + Add system notes
              </button>
            ) : null}

            {(displaySystemNotes || displayUserNotes || isEditingUserNotes || isEditingSystemNotes) && (
              <div className="h-px w-full bg-black/10" />
            )}

            {/* User notes section */}
            {isEditingUserNotes ? (
              <div className="flex flex-col gap-3">
                <textarea
                  value={userNotesInput}
                  onChange={(e) => setUserNotesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      handleSaveUserNotes();
                    }
                  }}
                  placeholder="Add your notes here..."
                  className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 p-3 text-small-regular focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveUserNotes}
                    className="rounded-lg bg-primary px-3 py-1.5 text-small-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelUserNotes}
                    className="rounded-lg px-3 py-1.5 text-small-semibold text-foreground/50 transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : displayUserNotes ? (
              <button
                onClick={() => {
                  setUserNotesInput(displayUserNotes);
                  setIsEditingUserNotes(true);
                }}
                className="w-full cursor-pointer text-left text-small-regular text-foreground whitespace-pre-wrap transition-colors hover:text-foreground/70"
              >
                {displayUserNotes}
              </button>
            ) : (
              <button
                onClick={() => setIsEditingUserNotes(true)}
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
