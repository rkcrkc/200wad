"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { ExampleSentence, Word } from "@/types/database";
import { cn } from "@/lib/utils";
import { saveDeveloperData, type DeveloperData } from "@/lib/mutations";
import { TipCard } from "./TipCard";
import type { TipForWord } from "@/lib/queries/tips";

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
  /** Developer data for admin debugging */
  developerNotes?: string | null;
  pictureWrong?: boolean | null;
  pictureWrongNotes?: string | null;
  pictureMissing?: boolean | null;
  pictureBadSvg?: boolean | null;
  notesInMemoryTrigger?: boolean | null;
  /** Contextual tips for this word */
  tips?: TipForWord[];
  /** Tip IDs the user has already dismissed */
  dismissedTipIds?: string[];
  /** Callback when user dismisses a tip */
  onDismissTip?: (tipId: string) => void;
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
  developerNotes: initialDeveloperNotes,
  pictureWrong: initialPictureWrong,
  pictureWrongNotes: initialPictureWrongNotes,
  pictureMissing: initialPictureMissing,
  pictureBadSvg: initialPictureBadSvg,
  notesInMemoryTrigger: initialNotesInMemoryTrigger,
  tips = [],
  dismissedTipIds = [],
  onDismissTip,
}: StudySidebarProps) {
  // User notes state
  const [isEditingUserNotes, setIsEditingUserNotes] = useState(false);
  const [userNotesInput, setUserNotesInput] = useState(userNotes || "");

  // System notes state (admin only)
  const [isEditingSystemNotes, setIsEditingSystemNotes] = useState(false);
  const [systemNotesInput, setSystemNotesInput] = useState(systemNotes || "");

  // Developer section state (admin only)
  const [isEditingDeveloperNotes, setIsEditingDeveloperNotes] = useState(false);
  const [developerNotesInput, setDeveloperNotesInput] = useState(initialDeveloperNotes || "");
  const [developerNotes, setDeveloperNotes] = useState(initialDeveloperNotes || null);
  const [pictureWrong, setPictureWrong] = useState(initialPictureWrong || false);
  const [pictureWrongNotesInput, setPictureWrongNotesInput] = useState(initialPictureWrongNotes || "");
  const [pictureWrongNotes, setPictureWrongNotes] = useState(initialPictureWrongNotes || null);
  const [pictureMissing, setPictureMissing] = useState(initialPictureMissing || false);
  const [pictureBadSvg, setPictureBadSvg] = useState(initialPictureBadSvg || false);
  const [notesInMemoryTrigger, setNotesInMemoryTrigger] = useState(initialNotesInMemoryTrigger || false);
  const [isSavingDeveloperData, setIsSavingDeveloperData] = useState(false);

  const prevWordIdRef = useRef(wordId);

  // Reset all local state when word changes
  useEffect(() => {
    if (wordId !== prevWordIdRef.current) {
      setUserNotesInput(userNotes || "");
      setIsEditingUserNotes(false);
      setSystemNotesInput(systemNotes || "");
      setIsEditingSystemNotes(false);
      // Reset developer section state
      setDeveloperNotesInput(initialDeveloperNotes || "");
      setDeveloperNotes(initialDeveloperNotes || null);
      setIsEditingDeveloperNotes(false);
      setPictureWrong(initialPictureWrong || false);
      setPictureWrongNotesInput(initialPictureWrongNotes || "");
      setPictureWrongNotes(initialPictureWrongNotes || null);
      setPictureMissing(initialPictureMissing || false);
      setPictureBadSvg(initialPictureBadSvg || false);
      setNotesInMemoryTrigger(initialNotesInMemoryTrigger || false);
      prevWordIdRef.current = wordId;
    }
  }, [wordId, userNotes, systemNotes, initialDeveloperNotes, initialPictureWrong, initialPictureWrongNotes, initialPictureMissing, initialPictureBadSvg, initialNotesInMemoryTrigger]);

  // User notes handlers
  const handleSaveUserNotes = () => {
    const trimmedNotes = userNotesInput.trim() || null;
    onUserNotesChange(trimmedNotes);
    setIsEditingUserNotes(false);
  };

  const handleCancelUserNotes = () => {
    setUserNotesInput(userNotes ?? "");
    setIsEditingUserNotes(false);
  };

  // System notes handlers (admin only)
  const handleSaveSystemNotes = () => {
    const trimmedNotes = systemNotesInput.trim() || null;
    onSystemNotesChange?.(trimmedNotes);
    setIsEditingSystemNotes(false);
  };

  const handleCancelSystemNotes = () => {
    setSystemNotesInput(systemNotes ?? "");
    setIsEditingSystemNotes(false);
  };

  // Developer notes handlers (admin only)
  const handleSaveDeveloperNotes = async () => {
    const trimmedNotes = developerNotesInput.trim() || null;
    setDeveloperNotes(trimmedNotes);
    setIsEditingDeveloperNotes(false);
    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: trimmedNotes,
      picture_wrong: pictureWrong,
      picture_wrong_notes: pictureWrongNotes,
      picture_missing: pictureMissing,
      picture_bad_svg: pictureBadSvg,
      notes_in_memory_trigger: notesInMemoryTrigger,
    };
    await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
  };

  const handleCancelDeveloperNotes = () => {
    setDeveloperNotesInput(developerNotes || "");
    setIsEditingDeveloperNotes(false);
  };

  // Picture checkbox handlers
  const handlePictureCheckboxChange = async (
    field: "wrong" | "missing" | "bad_svg",
    checked: boolean
  ) => {
    // Update local state immediately
    if (field === "wrong") {
      setPictureWrong(checked);
      if (!checked) {
        setPictureWrongNotes(null);
        setPictureWrongNotesInput("");
      }
    } else if (field === "missing") {
      setPictureMissing(checked);
    } else if (field === "bad_svg") {
      setPictureBadSvg(checked);
    }

    // Save immediately
    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: developerNotes,
      picture_wrong: field === "wrong" ? checked : pictureWrong,
      picture_wrong_notes: field === "wrong" && !checked ? null : pictureWrongNotes,
      picture_missing: field === "missing" ? checked : pictureMissing,
      picture_bad_svg: field === "bad_svg" ? checked : pictureBadSvg,
      notes_in_memory_trigger: notesInMemoryTrigger,
    };
    await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
  };

  const handleSavePictureWrongNotes = async () => {
    const trimmedNotes = pictureWrongNotesInput.trim() || null;
    setPictureWrongNotes(trimmedNotes);
    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: developerNotes,
      picture_wrong: pictureWrong,
      picture_wrong_notes: trimmedNotes,
      picture_missing: pictureMissing,
      picture_bad_svg: pictureBadSvg,
      notes_in_memory_trigger: notesInMemoryTrigger,
    };
    await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
  };

  // Text checkbox handler
  const handleTextCheckboxChange = async (
    field: "notes_in_memory_trigger",
    checked: boolean
  ) => {
    setNotesInMemoryTrigger(checked);
    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: developerNotes,
      picture_wrong: pictureWrong,
      picture_wrong_notes: pictureWrongNotes,
      picture_missing: pictureMissing,
      picture_bad_svg: pictureBadSvg,
      notes_in_memory_trigger: checked,
    };
    await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
  };

  // Display notes: parent prop is the source of truth
  const displayUserNotes = userNotes;
  const displaySystemNotes = systemNotes;

  const cardClasses = cn(
    "w-full rounded-2xl bg-white shadow-card transition-opacity",
    !isEnabled && "pointer-events-none opacity-30"
  );

  // Skeleton card for disabled state with shimmer animation
  if (!isEnabled) {
    return (
      <div className="flex flex-col gap-4">
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

  // Filter tips to exclude dismissed ones
  const visibleTips = tips.filter((tip) => !dismissedTipIds.includes(tip.id));

  return (
    <div className="flex flex-col gap-4">
      {/* Tip Cards - above Notes */}
      {isEnabled && visibleTips.map((tip) => (
        <TipCard
          key={tip.id}
          tipId={tip.id}
          title={tip.title}
          body={tip.body}
          emoji={tip.emoji}
          onDismiss={onDismissTip || (() => {})}
        />
      ))}

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

      {/* Developer Card - Admin only */}
      {isAdmin && (
        <div className={cardClasses}>
          <div className="flex flex-col gap-5 p-6">
            <span className="study-card-label uppercase tracking-wide text-foreground/50">
              DEVELOPER
            </span>

            <div className="flex flex-col gap-4">
              {/* Developer Notes */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground/70">Notes</span>
                {isEditingDeveloperNotes ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={developerNotesInput}
                      onChange={(e) => setDeveloperNotesInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.shiftKey) {
                          e.preventDefault();
                          handleSaveDeveloperNotes();
                        }
                      }}
                      placeholder="Add developer notes..."
                      className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 p-3 text-small-regular focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDeveloperNotes}
                        disabled={isSavingDeveloperData}
                        className="rounded-lg bg-primary px-3 py-1.5 text-small-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelDeveloperNotes}
                        className="rounded-lg px-3 py-1.5 text-small-semibold text-foreground/50 transition-colors hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : developerNotes ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-small-regular text-foreground whitespace-pre-wrap">{developerNotes}</p>
                    <button
                      onClick={() => {
                        setDeveloperNotesInput(developerNotes);
                        setIsEditingDeveloperNotes(true);
                      }}
                      className="self-start text-small-semibold text-foreground/50 transition-colors hover:text-foreground"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingDeveloperNotes(true)}
                    className="self-start text-small-regular text-foreground/50 transition-colors hover:text-foreground"
                  >
                    + Add developer notes
                  </button>
                )}
              </div>

              <div className="h-px w-full bg-black/10" />

              {/* Picture Section */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground/70">Picture</span>

                {/* Wrong Picture Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pictureWrong}
                    onChange={(e) => handlePictureCheckboxChange("wrong", e.target.checked)}
                    disabled={isSavingDeveloperData}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-small-regular text-foreground">Wrong picture</span>
                </label>

                {/* Wrong Picture Notes - Only show when wrong picture is checked */}
                {pictureWrong && (
                  <div className="ml-6 flex flex-col gap-2">
                    <input
                      type="text"
                      value={pictureWrongNotesInput}
                      onChange={(e) => setPictureWrongNotesInput(e.target.value)}
                      onBlur={handleSavePictureWrongNotes}
                      placeholder="Add notes about the issue..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-small-regular focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Missing Picture Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pictureMissing}
                    onChange={(e) => handlePictureCheckboxChange("missing", e.target.checked)}
                    disabled={isSavingDeveloperData}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-small-regular text-foreground">Missing picture</span>
                </label>

                {/* Bad SVG Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pictureBadSvg}
                    onChange={(e) => handlePictureCheckboxChange("bad_svg", e.target.checked)}
                    disabled={isSavingDeveloperData}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-small-regular text-foreground">Bad SVG</span>
                </label>
              </div>

              <div className="h-px w-full bg-black/10" />

              {/* Text Section */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium text-foreground/70">Text</span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notesInMemoryTrigger}
                    onChange={(e) => handleTextCheckboxChange("notes_in_memory_trigger", e.target.checked)}
                    disabled={isSavingDeveloperData}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-small-regular text-foreground">Notes appearing in memory trigger</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

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
