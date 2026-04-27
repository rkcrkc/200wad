"use client";

import Image from "next/image";
import { AudioType } from "@/hooks/useAudio";
import { AudioButton } from "@/components/ui/audio-button";
import { EditableText, EditableImage } from "@/components/admin";
import { genderColor, genderColorDark, defaultHighlightColor, defaultHighlightColorDark } from "@/lib/design-tokens";

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
  /** Admin edit mode props */
  wordId?: string;
  isEditMode?: boolean;
  onFieldSave?: (field: string, value: string) => Promise<boolean>;
  onImageUpload?: (field: string, file: File) => Promise<boolean>;
}

/**
 * Determine the highlight color based on word's gender.
 * Uses centralized gender color tokens from design-tokens.
 */
function getHighlightColor(gender?: string | null): string {
  if (gender && gender in genderColor) {
    return genderColor[gender];
  }
  return defaultHighlightColor;
}

/** Get darker shade of gender color for audio playback highlighting */
function getHighlightColorDark(gender?: string | null): string {
  if (gender && gender in genderColorDark) {
    return genderColorDark[gender];
  }
  return defaultHighlightColorDark;
}

/**
 * Parse trigger text and highlight:
 * - If text contains {{...}} markers: highlight marked text with color based on gender
 * - Otherwise: use legacy auto-detection (ALL CAPS = green, English word = blue italic)
 * - Rest of text: blue when playing, black otherwise
 */
function parseAndHighlightText(
  text: string,
  foreignWord: string,
  isPlaying: boolean,
  gender?: string | null,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const highlightColor = getHighlightColor(gender);
  const darkColor = getHighlightColorDark(gender);

  // Check if text uses {{...}} marker syntax
  if (text.includes("{{")) {
    // Parse using marker syntax
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the marker
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(
          <span key={keyIndex++} style={{ color: isPlaying ? darkColor : "#141515" }}>
            {beforeText}
          </span>
        );
      }

      // Add the highlighted marker content
      parts.push(
        <span
          key={keyIndex++}
          className="font-bold"
          style={{ color: highlightColor }}
        >
          {match[1]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text after the last marker
    if (lastIndex < text.length) {
      parts.push(
        <span key={keyIndex++} style={{ color: isPlaying ? darkColor : "#141515" }}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  }

  // Legacy auto-detection mode (no markers)
  const words = text.split(/(\s+)/);
  const cleanForeign = foreignWord.toLowerCase().replace(/[!?.,'"]/g, "");

  words.forEach((word, index) => {
    const cleanWord = word.toLowerCase().replace(/[!?.,'"]/g, "");

    // Check if this word matches the foreign word (highlighted with gender color)
    if (cleanWord === cleanForeign || cleanWord.includes(cleanForeign)) {
      parts.push(
        <span
          key={index}
          className="font-bold"
          style={{ color: highlightColor }}
        >
          {word}
        </span>
      );
    }
    // Check if word is in ALL CAPS (phonetic hint - highlighted with gender color)
    else if (word.match(/^[A-Z]{2,}[!?.,'"]*$/) && word.trim().length > 1) {
      parts.push(
        <span
          key={index}
          className="font-bold"
          style={{ color: highlightColor }}
        >
          {word}
        </span>
      );
    }
    // Regular text: dark gender color when playing, black otherwise
    else {
      parts.push(
        <span key={index} style={{ color: isPlaying ? darkColor : "#141515" }}>
          {word}
        </span>
      );
    }
  });

  return parts;
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
  wordId,
  isEditMode = false,
  onFieldSave,
  onImageUpload,
}: MemoryTriggerCardProps) {
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

  return (
    <div className="w-full rounded-2xl bg-white shadow-card">
      <div className="flex flex-col gap-5 px-6 py-5">
        {/* Trigger text row - audio button on left, matching word card layout */}
        {showTriggerTextProp !== undefined && triggerText && showTrigger ? (
          // Study mode: show trigger text when visible
          <button
            onClick={isEditMode ? undefined : onPlayTriggerAudio}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            <AudioButton isPlaying={isPlayingTrigger} playingColor={audioDarkColor} />
            {isEditMode && wordId && onFieldSave ? (
              <EditableText
                value={triggerText}
                field="memory_trigger_text"
                wordId={wordId}
                isEditMode={isEditMode}
                onSave={onFieldSave}
                className="text-[22px] font-medium leading-normal"
                inputClassName="text-[22px] font-medium w-full"
                multiline
              />
            ) : (
              <p className="text-[22px] font-medium leading-normal">
                {parseAndHighlightText(triggerText, foreignWord, isPlayingTrigger, gender)}
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
              <EditableText
                value={triggerText}
                field="memory_trigger_text"
                wordId={wordId}
                isEditMode={isEditMode}
                onSave={onFieldSave}
                className="text-[22px] font-medium leading-normal"
                inputClassName="text-[22px] font-medium w-full"
                multiline
              />
            ) : (
              <p className="text-[22px] font-medium leading-normal">
                {parseAndHighlightText(triggerText, foreignWord, isPlayingTrigger, gender)}
              </p>
            )}
          </button>
        ) : showTrigger && !triggerText && isEditMode && wordId && onFieldSave ? (
          // Edit mode: allow adding trigger text when none exists
          <div className="flex items-center gap-3">
            <AudioButton isPlaying={false} />
            <EditableText
              value=""
              field="memory_trigger_text"
              wordId={wordId}
              isEditMode={isEditMode}
              onSave={onFieldSave}
              className="text-large-semibold leading-normal text-muted-foreground"
              inputClassName="text-large-semibold w-full"
              multiline
            />
          </div>
        ) : showTriggerTextProp === undefined && (!pictureOnlyMode || showTrigger) ? (
          // Test mode: show animated skeleton when trigger text not yet revealed
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-100" />
            <div className="h-[33px] flex-1 animate-pulse rounded bg-gray-100" />
          </div>
        ) : null}

        {/* Trigger Image - visible at clueLevel 1+ (always visible in picture-only mode) */}
        {isEditMode && wordId && onImageUpload ? (
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
        ) : showImage && !imageUrl ? (
          // No image but should show - show placeholder
          <div className="flex h-[400px] w-full items-center justify-center rounded-lg bg-gray-50">
            <span className="text-6xl">🖼️</span>
          </div>
        ) : (
          // Image skeleton when clueLevel=0 but should show card
          <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
        )}
      </div>
    </div>
  );
}
