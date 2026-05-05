"use client";

import { EditableText } from "@/components/admin/EditableText";
import { EditableBodyText } from "@/components/admin/EditableBodyText";
import { BodyTextSyntaxHelp } from "@/components/admin/BodyTextSyntaxHelp";
import { parseFormattedText } from "@/lib/utils/parseFormattedText";
import { DeveloperSection } from "./DeveloperSection";

interface InformationCardProps {
  title: string;
  subheading: string;
  body: string | null;
  imageUrl: string | null;
  /** Admin inline editing */
  wordId?: string;
  isEditMode?: boolean;
  onFieldSave?: (field: string, value: string) => Promise<boolean>;
  /** Whether current user is an admin (controls developer section visibility) */
  isAdmin?: boolean;
  /** Developer data for admin debugging */
  developerNotes?: string | null;
  pictureWrong?: boolean | null;
  pictureWrongNotes?: string | null;
  pictureMissing?: boolean | null;
  pictureBadSvg?: boolean | null;
  notesInMemoryTrigger?: boolean | null;
}

export function InformationCard({
  title,
  subheading,
  body,
  imageUrl,
  wordId,
  isEditMode = false,
  onFieldSave,
  isAdmin = false,
  developerNotes,
  pictureWrong,
  pictureWrongNotes,
  pictureMissing,
  pictureBadSvg,
  notesInMemoryTrigger,
}: InformationCardProps) {
  const canEdit = isEditMode && wordId && onFieldSave;

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full rounded-2xl bg-white p-8">
      {/* Title */}
      {canEdit ? (
        <EditableText
          value={title}
          field="english"
          wordId={wordId}
          isEditMode={isEditMode}
          onSave={onFieldSave}
          className="text-3xl font-bold text-foreground"
          inputClassName="text-3xl font-bold"
        />
      ) : (
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      )}

      {/* Subheading */}
      {canEdit ? (
        <div className="mt-2">
          <EditableText
            value={subheading}
            field="headword"
            wordId={wordId}
            isEditMode={isEditMode}
            onSave={onFieldSave}
            className="text-base font-medium text-muted-foreground"
            inputClassName="text-base font-medium"
          />
        </div>
      ) : (
        <p className="mt-2 text-base font-medium text-muted-foreground">{subheading}</p>
      )}

      {/* Divider */}
      <div className="my-6 border-t border-black/10" />

      {/* Body + Image */}
      <div className="flex flex-col gap-6 md:flex-row">
        {canEdit ? (
          <div className={imageUrl ? "flex-1" : "w-full"}>
            <EditableBodyText
              value={body || ""}
              field="memory_trigger_text"
              wordId={wordId}
              isEditMode={isEditMode}
              onSave={onFieldSave}
              className="prose prose-base max-w-none"
              renderPreview={(v) =>
                v ? (
                  parseFormattedText(v)
                ) : (
                  <p className="text-muted-foreground">No body text yet — click to add</p>
                )
              }
              rows={10}
              placeholder="Write the information page content..."
              variant="multi"
            />
            <div className="mt-3">
              <BodyTextSyntaxHelp defaultOpen={false} variant="multi" />
            </div>
          </div>
        ) : body ? (
          <div className={`prose prose-base max-w-none ${imageUrl ? "flex-1" : "w-full"}`}>
            {parseFormattedText(body)}
          </div>
        ) : null}
        {imageUrl && (
          <div className={body || canEdit ? "w-full md:w-[45%]" : "w-full"}>
            <img
              src={imageUrl}
              alt={title}
              className="w-full rounded-xl object-contain"
            />
          </div>
        )}
      </div>
      </div>

      {isAdmin && wordId && (
        <DeveloperSection
          wordId={wordId}
          developerNotes={developerNotes}
          pictureWrong={pictureWrong}
          pictureWrongNotes={pictureWrongNotes}
          pictureMissing={pictureMissing}
          pictureBadSvg={pictureBadSvg}
          notesInMemoryTrigger={notesInMemoryTrigger}
        />
      )}
    </div>
  );
}
