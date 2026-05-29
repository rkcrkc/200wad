"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronRight, Info } from "lucide-react";
import { ExampleSentence } from "@/types/database";
import type { RelatedEntry, RelatedEntryGroups } from "@/lib/queries/words";
import { cn } from "@/lib/utils";
import { parseFormattedText } from "@/lib/utils/parseFormattedText";
import { BodyTextEditor } from "@/components/admin/BodyTextEditor";
import { BodyTextSyntaxHelp } from "@/components/admin/BodyTextSyntaxHelp";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { TipCard } from "./TipCard";
import { DeveloperSection } from "./DeveloperSection";
import type { DeveloperData } from "@/lib/mutations";
import type { TipForWord } from "@/lib/queries/tips";

interface StudySidebarProps {
  /** Current word ID - used to detect word changes and reset local state */
  wordId: string;
  systemNotes: string | null;
  userNotes: string | null;
  exampleSentences: ExampleSentence[];
  /**
   * Cross-references from `word_relationships`, grouped by relationship type.
   * Each non-empty group renders as a separate card.
   */
  relatedWords: RelatedEntryGroups;
  isEnabled: boolean;
  onUserNotesChange: (notes: string | null) => void;
  /** Open another entry in the global word preview sidebar. */
  onRelatedClick?: (wordId: string) => void;
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
  /** Callback when developer data is saved (so parent can update its cached word) */
  onDeveloperDataChange?: (data: DeveloperData) => void;
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
  developerNotes,
  pictureWrong,
  pictureWrongNotes,
  pictureMissing,
  pictureBadSvg,
  notesInMemoryTrigger,
  onDeveloperDataChange,
  tips = [],
  dismissedTipIds = [],
  onDismissTip,
  onRelatedClick,
}: StudySidebarProps) {
  // User notes state
  const [isEditingUserNotes, setIsEditingUserNotes] = useState(false);
  const [userNotesInput, setUserNotesInput] = useState(userNotes || "");

  // System notes state (admin only)
  const [isEditingSystemNotes, setIsEditingSystemNotes] = useState(false);
  const [systemNotesInput, setSystemNotesInput] = useState(systemNotes || "");

  const prevWordIdRef = useRef(wordId);

  // Reset notes state when word changes
  useEffect(() => {
    if (wordId !== prevWordIdRef.current) {
      setUserNotesInput(userNotes || "");
      setIsEditingUserNotes(false);
      setSystemNotesInput(systemNotes || "");
      setIsEditingSystemNotes(false);
      prevWordIdRef.current = wordId;
    }
  }, [wordId, userNotes, systemNotes]);

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

  // Display notes: parent prop is the source of truth
  const displayUserNotes = userNotes;
  const displaySystemNotes = systemNotes;

  const cardClasses = cn(
    "w-full overflow-hidden rounded-2xl bg-white shadow-card transition-opacity",
    !isEnabled && "pointer-events-none opacity-30"
  );

  // Skeleton card for disabled state with shimmer animation
  if (!isEnabled) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4">
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
    <div className="flex w-full min-w-0 flex-col gap-4">
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
                <BodyTextSyntaxHelp defaultOpen={false} variant="multi" />
                <BodyTextEditor
                  value={systemNotesInput}
                  onChange={(v) => setSystemNotesInput(v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      handleSaveSystemNotes();
                    }
                  }}
                  placeholder="Add system notes..."
                  rows={5}
                  variant="multi"
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
                <div className="text-small-regular text-foreground">
                  {parseFormattedText(displaySystemNotes)}
                </div>
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
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <p className="text-small-regular text-foreground break-words">
                        {sentence.foreign_sentence}
                      </p>
                      <p className="text-small-regular text-foreground/60 break-words">
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

      {/* Related-entries card. One card, grouped by relationship_type via
          per-item badges, rendered in `compound → sentence → grammar` order
          so similar items cluster. */}
      <RelatedEntriesCard
        groups={relatedWords}
        cardClasses={cardClasses}
        onRelatedClick={onRelatedClick}
      />

      {/* Developer Card - Admin only */}
      {isAdmin && (
        <DeveloperSection
          wordId={wordId}
          developerNotes={developerNotes}
          pictureWrong={pictureWrong}
          pictureWrongNotes={pictureWrongNotes}
          pictureMissing={pictureMissing}
          pictureBadSvg={pictureBadSvg}
          notesInMemoryTrigger={notesInMemoryTrigger}
          isEnabled={isEnabled}
          onSaved={onDeveloperDataChange}
        />
      )}
    </div>
  );
}

/** Map a `relationship_type` to its per-item badge label. */
const RELATIONSHIP_BADGE_LABEL: Record<keyof RelatedEntryGroups, string> = {
  compound: "Word",
  sentence: "Sentence",
  grammar: "Grammar",
};

type FlatRelatedEntry = RelatedEntry & { kind: keyof RelatedEntryGroups };

function flattenRelatedGroups(groups: RelatedEntryGroups): FlatRelatedEntry[] {
  // Order matches the per-item badge groupings so compounds list first.
  return [
    ...groups.compound.map((e) => ({ ...e, kind: "compound" as const })),
    ...groups.sentence.map((e) => ({ ...e, kind: "sentence" as const })),
    ...groups.grammar.map((e) => ({ ...e, kind: "grammar" as const })),
  ];
}

/** Single bordered, standalone related-entry button with a kind badge. */
function RelatedEntryItem({
  entry,
  onRelatedClick,
}: {
  entry: FlatRelatedEntry;
  onRelatedClick?: (wordId: string) => void;
}) {
  return (
    <button
      onClick={() => onRelatedClick?.(entry.id)}
      className="group/related flex w-full items-center gap-4 py-4 text-left first:pt-0 last:pb-0"
    >
      {entry.memory_trigger_image_url ? (
        <div className="relative h-[62px] w-[62px] shrink-0 overflow-hidden rounded-lg">
          <Image
            src={entry.memory_trigger_image_url}
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
      <div className="flex min-w-0 flex-1 flex-col gap-0">
        <p className="truncate text-small-medium text-foreground transition-colors duration-150 group-hover/related:text-primary">{entry.english}</p>
        <p className="truncate text-small-regular text-foreground/60">{entry.headword}</p>
        <Badge size="xs" className="mt-1.5 w-fit">
          {RELATIONSHIP_BADGE_LABEL[entry.kind]}
        </Badge>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-foreground/50 transition-all duration-150 group-hover/related:translate-x-1 group-hover/related:text-foreground" />
    </button>
  );
}

/** Single card containing all related entries; renders nothing when all groups are empty. */
function RelatedEntriesCard({
  groups,
  cardClasses,
  onRelatedClick,
}: {
  groups: RelatedEntryGroups;
  cardClasses: string;
  onRelatedClick?: (wordId: string) => void;
}) {
  const entries = flattenRelatedGroups(groups);
  if (entries.length === 0) return null;
  return (
    <div className={cn(cardClasses, "related-words-card")}>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="study-card-label uppercase tracking-wide text-foreground/50">
            RELATED WORDS
          </span>
          <Tooltip
            label="Find related words distracting? You can hide this card in Settings → Preferences."
            position="below"
            align="right"
          >
            <Info
              className="h-4 w-4 text-foreground/40 hover:text-foreground/70 transition-colors"
              aria-label="About related words"
            />
          </Tooltip>
        </div>
        <div className="flex flex-col divide-y divide-black/10">
          {entries.map((entry) => (
            <RelatedEntryItem
              key={`${entry.kind}-${entry.id}`}
              entry={entry}
              onRelatedClick={onRelatedClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
