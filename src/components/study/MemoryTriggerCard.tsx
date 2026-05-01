"use client";

import Image from "next/image";
import { AudioType } from "@/hooks/useAudio";
import { AudioButton } from "@/components/ui/audio-button";
import { EditableImage } from "@/components/admin";
import { EditableBodyText } from "@/components/admin/EditableBodyText";
import { BodyTextSyntaxHelp } from "@/components/admin/BodyTextSyntaxHelp";
import { genderColorDark, defaultHighlightColorDark } from "@/lib/design-tokens";
import { parseFormattedText } from "@/lib/utils/parseFormattedText";

interface MemoryTriggerCardProps {
  imageUrl: string | null;
  triggerText: string | null;
  foreignWord: string;
  /** Word gender for color-coded highlighting (f=red, m=blue, n=purple) */
  gender?: string | null;
  playingAudioType: AudioType | null;
  onPlayTriggerAudio: () => void;
  /**
   * Study mode: explicit control over image visibility.
   * When provided, takes precedence over isVisible/clueLevel for image display.
   */
  showImage?: boolean;
  /**
   * Study mode: explicit control over trigger text visibility.
   * When provided, takes precedence over isVisible/clueLevel for trigger text display.
   */
  showTriggerText?: boolean;
  /**
   * Legacy prop for simple show/hide of both image and trigger text.
   * Used when showImage/showTriggerText are not provided.
   */
  isVisible?: boolean;
  /** For test mode: clue level determines what's visible
   * Normal mode (pictureOnlyMode=false):
   * - 0: nothing visible (both image and trigger hidden)
   * - 1: image visible, trigger hidden
   * - 2: both visible
   * Picture-only mode (pictureOnlyMode=true):
   * - 0: image always visible, English word and trigger hidden
   * - 1: image visible, English word visible, trigger hidden
   * - 2: all visible
   * - undefined: use isVisible prop (study mode)
   */
  clueLevel?: 0 | 1 | 2;
  /** Picture-only test mode: image is always visible, clues reveal English word then trigger text */
  pictureOnlyMode?: boolean;
  /**
   * Layout variant.
   * - "stacked" (default): trigger text on top, image full width below
   * - "horizontal": trigger text on left, image on right (used for fact pages)
   */
  layout?: "stacked" | "horizontal";
  /**
   * When true (stacked layout only), hides the audio button + trigger text row,
   * rendering only the image. The image is also non-clickable. Used for fact
   * pages where the body text lives in a separate sidebar card.
   */
  imageOnly?: boolean;
  /** Admin edit mode props */
  wordId?: string;
  isEditMode?: boolean;
  onFieldSave?: (field: string, value: string) => Promise<boolean>;
  onImageUpload?: (field: string, file: File) => Promise<boolean>;
}

/** Get darker shade of gender color for audio playback highlighting */
function getHighlightColorDark(gender?: string | null): string {
  if (gender && gender in genderColorDark) {
    return genderColorDark[gender];
  }
  return defaultHighlightColorDark;
}

export function MemoryTriggerCard({
  imageUrl,
  triggerText,
  foreignWord,
  gender,
  playingAudioType,
  onPlayTriggerAudio,
  showImage: showImageProp,
  showTriggerText: showTriggerTextProp,
  isVisible,
  clueLevel,
  pictureOnlyMode = false,
  layout = "stacked",
  imageOnly = false,
  wordId,
  isEditMode = false,
  onFieldSave,
  onImageUpload,
}: MemoryTriggerCardProps) {
  const isHorizontal = layout === "horizontal";
  const isPlayingTrigger = playingAudioType === "trigger";
  const audioDarkColor = getHighlightColorDark(gender);

  // If there's no memory trigger content at all, hide the entire card
  const hasNoContent = !triggerText && !imageUrl;
  if (hasNoContent) {
    return null;
  }

  // Determine visibility:
  // 1. If explicit showImage/showTriggerText props are provided, use them (study mode)
  // 2. Otherwise fall back to clueLevel (test mode) or isVisible (legacy)
  const showImage = showImageProp !== undefined
    ? showImageProp
    : pictureOnlyMode
      ? true  // Always show image in picture-only mode
      : (clueLevel !== undefined ? clueLevel >= 1 : isVisible);
  const showTrigger = showTriggerTextProp !== undefined
    ? showTriggerTextProp
    : (clueLevel !== undefined ? clueLevel >= 2 : isVisible);
  const showNothing = showImageProp !== undefined || showTriggerTextProp !== undefined
    ? !showImage && !showTrigger  // Use explicit props
    : pictureOnlyMode
      ? false  // Never show "nothing" skeleton in picture-only mode
      : (clueLevel !== undefined ? clueLevel === 0 : !isVisible);

  // Full skeleton when nothing visible
  if (showNothing) {
    if (isHorizontal) {
      return (
        <div className="w-full rounded-2xl bg-white shadow-card">
          <div className="flex flex-col gap-6 p-8 md:flex-row">
            <div className="flex-1">
              <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
            </div>
            <div className="w-full md:w-[45%]">
              <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full rounded-2xl bg-white shadow-card">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
            <div className="h-8 flex-1 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  // Horizontal layout (fact pages): no audio button, no highlighting, plain reveal
  if (isHorizontal) {
    const factTriggerBlock = showTrigger && triggerText ? (
      isEditMode && wordId && onFieldSave ? (
        <div className="space-y-3">
          <EditableBodyText
            value={triggerText}
            field="memory_trigger_text"
            wordId={wordId}
            isEditMode={isEditMode}
            onSave={onFieldSave}
            className="space-y-4 text-base leading-relaxed text-foreground"
            renderPreview={(v) => (
              <div className="space-y-4 text-base leading-relaxed text-foreground">
                {parseFormattedText(v, { gender })}
              </div>
            )}
            rows={8}
            variant="multi"
          />
          <BodyTextSyntaxHelp defaultOpen={false} variant="multi" />
        </div>
      ) : (
        <div className="space-y-4 text-base leading-relaxed text-foreground">
          {parseFormattedText(triggerText, { gender })}
        </div>
      )
    ) : showTrigger && !triggerText && isEditMode && wordId && onFieldSave ? (
      <div className="space-y-3">
        <EditableBodyText
          value=""
          field="memory_trigger_text"
          wordId={wordId}
          isEditMode={isEditMode}
          onSave={onFieldSave}
          className="space-y-4 text-base leading-relaxed text-muted-foreground"
          renderPreview={() => (
            <p className="text-muted-foreground">No body text yet — click to add</p>
          )}
          rows={8}
          placeholder="Write the fact body text..."
          variant="multi"
        />
        <BodyTextSyntaxHelp defaultOpen={false} variant="multi" />
      </div>
    ) : (
      // Skeleton when not yet revealed
      <div className="space-y-2">
        <div className="h-6 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-gray-100" />
      </div>
    );

    const factImageBlock = isEditMode && wordId && onImageUpload ? (
      <EditableImage
        src={imageUrl}
        alt="Memory trigger"
        field="memory_trigger_image_url"
        wordId={wordId}
        isEditMode={isEditMode}
        onUpload={onImageUpload}
        height={400}
        className="w-full"
      />
    ) : showImage && imageUrl ? (
      <div className="relative h-[400px] w-full overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt="Memory trigger"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 730px"
        />
      </div>
    ) : showImage && !imageUrl ? (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg bg-gray-50">
        <span className="text-6xl">🖼️</span>
      </div>
    ) : (
      <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
    );

    return (
      <div className="w-full rounded-2xl bg-white shadow-card">
        <div className="flex flex-col gap-6 p-8 md:flex-row">
          <div className="flex-1">{factTriggerBlock}</div>
          <div className="w-full md:w-[45%]">{factImageBlock}</div>
        </div>
      </div>
    );
  }

  // Trigger text block (audio button + paragraph or skeleton)
  const triggerBlock = (
    <>
      {/* Trigger text row - audio button on left, matching word card layout */}
      {showTriggerTextProp !== undefined && triggerText && showTrigger ? (
        // Study mode: show trigger text when visible
        <button
          onClick={isEditMode ? undefined : onPlayTriggerAudio}
          className="flex items-center gap-3 text-left cursor-pointer"
        >
          <AudioButton isPlaying={isPlayingTrigger} playingColor={audioDarkColor} />
          {isEditMode && wordId && onFieldSave ? (
            <div className="flex-1">
              <EditableBodyText
                value={triggerText}
                field="memory_trigger_text"
                wordId={wordId}
                isEditMode={isEditMode}
                onSave={onFieldSave}
                className="text-[22px] font-medium leading-normal"
                textareaClassName="text-[22px] font-medium"
                rows={3}
                variant="word"
                renderPreview={(v) => (
                  <p className="text-[22px] font-medium leading-normal">
                    {parseFormattedText(v, { gender, headword: foreignWord, isPlaying: isPlayingTrigger, paragraphs: false })}
                  </p>
                )}
              />
            </div>
          ) : (
            <p className="text-[22px] font-medium leading-normal">
              {parseFormattedText(triggerText, { gender, headword: foreignWord, isPlaying: isPlayingTrigger, paragraphs: false })}
            </p>
          )}
        </button>
      ) : showTriggerTextProp !== undefined && triggerText && !showTrigger ? (
        // Study mode: show skeleton when trigger not yet revealed
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 flex-shrink-0 animate-pulse rounded-full bg-gray-100" />
          <div className="h-[33px] flex-1 animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : showTrigger && triggerText ? (
        // Test mode / edit mode: render normally when visible
        <button
          onClick={isEditMode ? undefined : onPlayTriggerAudio}
          className="flex cursor-pointer items-center gap-3 text-left"
        >
          <AudioButton isPlaying={isPlayingTrigger} playingColor={audioDarkColor} />
          {isEditMode && wordId && onFieldSave ? (
            <div className="flex-1">
              <EditableBodyText
                value={triggerText}
                field="memory_trigger_text"
                wordId={wordId}
                isEditMode={isEditMode}
                onSave={onFieldSave}
                className="text-[22px] font-medium leading-normal"
                textareaClassName="text-[22px] font-medium"
                rows={3}
                variant="word"
                renderPreview={(v) => (
                  <p className="text-[22px] font-medium leading-normal">
                    {parseFormattedText(v, { gender, headword: foreignWord, isPlaying: isPlayingTrigger, paragraphs: false })}
                  </p>
                )}
              />
            </div>
          ) : (
            <p className="text-[22px] font-medium leading-normal">
              {parseFormattedText(triggerText, { gender, headword: foreignWord, isPlaying: isPlayingTrigger, paragraphs: false })}
            </p>
          )}
        </button>
      ) : showTrigger && !triggerText && isEditMode && wordId && onFieldSave ? (
        // Edit mode: allow adding trigger text when none exists
        <div className="flex items-center gap-3">
          <AudioButton isPlaying={false} />
          <div className="flex-1">
            <EditableBodyText
              value=""
              field="memory_trigger_text"
              wordId={wordId}
              isEditMode={isEditMode}
              onSave={onFieldSave}
              className="text-large-semibold leading-normal text-muted-foreground"
              textareaClassName="text-large-semibold"
              rows={3}
              variant="word"
              placeholder="Add memory trigger text..."
              renderPreview={() => (
                <p className="text-large-semibold leading-normal text-muted-foreground">
                  Click to add memory trigger text
                </p>
              )}
            />
          </div>
        </div>
      ) : showTriggerTextProp === undefined && (!pictureOnlyMode || showTrigger) ? (
        // Test mode: show animated skeleton when trigger text not yet revealed
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-pulse rounded-full bg-gray-100" />
          <div className="h-[33px] flex-1 animate-pulse rounded bg-gray-100" />
        </div>
      ) : null}
    </>
  );

  // Image block - visible at clueLevel 1+ (always visible in picture-only mode)
  const imageBlock = isEditMode && wordId && onImageUpload ? (
    // Edit mode: use EditableImage component
    <EditableImage
      src={imageUrl}
      alt="Memory trigger"
      field="memory_trigger_image_url"
      wordId={wordId}
      isEditMode={isEditMode}
      onUpload={onImageUpload}
      height={400}
      className="w-full"
    />
  ) : showImage && imageUrl ? (
    imageOnly ? (
      <div className="relative h-[400px] w-full overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt="Memory trigger"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 730px"
        />
      </div>
    ) : (
      <button
        onClick={onPlayTriggerAudio}
        className="relative h-[400px] w-full cursor-pointer overflow-hidden rounded-lg"
      >
        <Image
          src={imageUrl}
          alt="Memory trigger"
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 730px"
        />
      </button>
    )
  ) : showImage && !imageUrl ? (
    // No image but should show - show placeholder
    <div className="flex h-[400px] w-full items-center justify-center rounded-lg bg-gray-50">
      <span className="text-6xl">🖼️</span>
    </div>
  ) : (
    // Image skeleton when clueLevel=0 but should show card
    <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
  );

  return (
    <div className="w-full rounded-2xl bg-white shadow-card">
      <div className="flex flex-col gap-5 px-6 py-5">
        {!imageOnly && triggerBlock}
        {imageBlock}
      </div>
    </div>
  );
}
