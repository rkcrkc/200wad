"use client";

import { EditableBodyText } from "@/components/admin/EditableBodyText";
import { BodyTextSyntaxHelp } from "@/components/admin/BodyTextSyntaxHelp";
import { parseFormattedText } from "@/lib/utils/parseFormattedText";
import { cn } from "@/lib/utils";

interface FactBodyCardProps {
  bodyText: string | null;
  /** Word gender for color-coded highlighting in formatted text */
  gender?: string | null;
  /** When false, the card content is hidden behind a skeleton (study reveal) */
  isVisible?: boolean;
  /** Admin edit mode props */
  wordId?: string;
  isEditMode?: boolean;
  onFieldSave?: (field: string, value: string) => Promise<boolean>;
}

/**
 * Card that renders a fact's body text. Sits in the right-hand sidebar above
 * the Notes card on fact study/test pages. Supports admin inline editing of
 * the underlying `memory_trigger_text` column.
 */
export function FactBodyCard({
  bodyText,
  gender,
  isVisible = true,
  wordId,
  isEditMode = false,
  onFieldSave,
}: FactBodyCardProps) {
  // Hide the card entirely when there's no content and no admin to add it.
  if (!bodyText && !isEditMode) {
    return null;
  }

  const cardClasses = cn(
    "w-full rounded-2xl bg-white shadow-card transition-opacity",
    !isVisible && "pointer-events-none opacity-30"
  );

  return (
    <div className={cardClasses}>
      <div className="flex flex-col gap-3 p-6">
        {!isVisible ? (
          <div className="space-y-2">
            <div className="h-6 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-gray-100" />
            <div className="h-6 w-5/6 animate-pulse rounded bg-gray-100" />
          </div>
        ) : isEditMode && wordId && onFieldSave ? (
          <>
            <EditableBodyText
              value={bodyText || ""}
              field="memory_trigger_text"
              wordId={wordId}
              isEditMode={isEditMode}
              onSave={onFieldSave}
              className="space-y-4 text-base leading-relaxed text-foreground"
              renderPreview={(v) =>
                v ? (
                  <div className="space-y-4 text-base leading-relaxed text-foreground">
                    {parseFormattedText(v, { gender })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No body text yet — click to add
                  </p>
                )
              }
              rows={8}
              placeholder="Write the fact body text..."
              variant="multi"
            />
            <BodyTextSyntaxHelp defaultOpen={false} variant="multi" />
          </>
        ) : (
          <div className="space-y-4 text-base leading-relaxed text-foreground">
            {parseFormattedText(bodyText!, { gender })}
          </div>
        )}
      </div>
    </div>
  );
}
