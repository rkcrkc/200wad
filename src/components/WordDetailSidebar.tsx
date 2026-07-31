"use client";

import { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { X, ChevronsRightLeft, ChevronsLeftRight } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { WordDetailView } from "@/components/WordDetailView";
import { WordDetailActionBar } from "@/components/WordDetailActionBar";
import type { AdjacentLesson, WordWithDetails } from "@/lib/queries/words";
import { useText } from "@/context/TextContext";
import { useWordPreview } from "@/context/WordPreviewContext";
import { useStudyExitGuard } from "@/context/StudyExitGuardContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { updateWord } from "@/lib/mutations/admin/words";
import {
  setWordImageOverride,
  setWordVideoOverride,
  updateImageGroup,
  getWordImageContext,
  type WordImageContext,
} from "@/lib/mutations/admin/imageGroups";
import {
  uploadFileClient,
  validateTriggerVideo,
  generatePosterFromVideo,
} from "@/lib/supabase/storage.client";

interface WordListItem {
  id: string;
  english: string;
  foreign: string;
}

interface WordDetailSidebarProps {
  word: WordWithDetails;
  lessonTitle: string;
  lessonNumber: number;
  /** When provided, the lesson chip in the header becomes a link to the lesson. */
  lessonId?: string;
  /** All lessons containing this word, ordered by lesson number. When omitted,
   *  WordDetailView will fetch lazily. Used to render the "Lessons" tab when
   *  a word belongs to 2+ lessons. */
  lessons?: AdjacentLesson[];
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onJumpToWord?: (index: number) => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex: number;
  totalWords: number;
  wordList: WordListItem[];
  isAdmin?: boolean;
  showProgress?: boolean;
  /** When true, hides the memory trigger and shows an upgrade overlay instead. */
  isLocked?: boolean;
}

const SIDEBAR_SIZES = [
  { key: "sm", width: 480, label: "Small", Icon: ChevronsLeftRight },
  { key: "md", width: 600, label: "Medium", Icon: ChevronsLeftRight },
  { key: "lg", width: 800, label: "Large", Icon: ChevronsRightLeft },
] as const;

type SidebarSizeKey = (typeof SIDEBAR_SIZES)[number]["key"];

const STORAGE_KEY = "word-detail-sidebar-size";
const DEFAULT_SIZE: SidebarSizeKey = "md";

function getSizeConfig(key: SidebarSizeKey) {
  return SIDEBAR_SIZES.find((s) => s.key === key)!;
}

export function WordDetailSidebar({
  word,
  lessonTitle,
  lessonNumber,
  lessonId,
  lessons,
  onClose,
  onPrevious,
  onNext,
  onJumpToWord,
  hasPrevious = false,
  hasNext = false,
  currentIndex,
  totalWords,
  wordList,
  isAdmin = false,
  showProgress = true,
  isLocked = false,
}: WordDetailSidebarProps) {
  const { t, tt } = useText();
  const isMobile = useIsMobile();
  // Clicking a related entry from inside the preview sidebar swaps content
  // in-place via the existing openWord behavior (URL replace, no history bloat).
  const { openWord } = useWordPreview();
  const exitGuard = useStudyExitGuard();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<(() => void) | null>(null);
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");

  // Admin edit mode: keep a local optimistic copy of the word so field/audio/
  // image saves reflect in the preview immediately (the prop isn't re-fetched).
  const [isEditMode, setIsEditMode] = useState(false);
  const [localWord, setLocalWord] = useState<WordWithDetails>(word);
  const [imageContext, setImageContext] = useState<WordImageContext | null>(null);

  // Reset the local copy whenever the previewed word changes.
  useEffect(() => {
    setLocalWord(word);
  }, [word]);

  // Load the group/override image context when edit mode is on (admin only) so
  // the two-tile image editor can offer the shared-concept control.
  useEffect(() => {
    if (!isEditMode || !isAdmin) {
      setImageContext(null);
      return;
    }
    let cancelled = false;
    setImageContext(null);
    getWordImageContext(word.id).then((ctx) => {
      if (!cancelled) setImageContext(ctx);
    });
    return () => {
      cancelled = true;
    };
  }, [isEditMode, isAdmin, word.id]);

  const handleFieldSave = useCallback(
    async (field: string, value: string): Promise<boolean> => {
      const result = await updateWord(word.id, { [field]: value }, lessonId);
      if (result.success) {
        setLocalWord((w) => ({ ...w, [field]: value }));
        return true;
      }
      console.error("Failed to update word field:", result.error);
      return false;
    },
    [word.id, lessonId]
  );

  const handleArrayFieldSave = useCallback(
    async (field: string, value: string[]): Promise<boolean> => {
      const result = await updateWord(word.id, { [field]: value }, lessonId);
      if (result.success) {
        setLocalWord((w) => ({ ...w, [field]: value }));
        return true;
      }
      console.error("Failed to update word array field:", result.error);
      return false;
    },
    [word.id, lessonId]
  );

  const handleAudioUpload = useCallback(
    async (
      audioType: "english" | "foreign" | "trigger",
      file: File
    ): Promise<boolean> => {
      const uploadResult = await uploadFileClient("audio", file, "words", word.id, audioType);
      if (uploadResult.error || !uploadResult.url) {
        console.error("Failed to upload audio:", uploadResult.error);
        return false;
      }
      const url = `${uploadResult.url}?v=${Date.now()}`;
      const column =
        audioType === "english"
          ? "audio_url_english"
          : audioType === "foreign"
            ? "audio_url_foreign"
            : "audio_url_trigger";

      const result = await updateWord(word.id, { [column]: url }, lessonId);
      if (!result.success) {
        console.error("Failed to save audio URL:", result.error);
        return false;
      }
      setLocalWord((w) => ({ ...w, [column]: url }));
      return true;
    },
    [word.id, lessonId]
  );

  // Set this word's own picture/video (override). Only this word changes.
  const handleWordImageUpload = useCallback(
    async (file: File): Promise<boolean> => {
      // MP4: upload the clip to word-videos and derive a poster still into
      // word-images so the image column keeps serving as the fallback/poster.
      if (file.type === "video/mp4") {
        const validationError = validateTriggerVideo(file);
        if (validationError) {
          console.error("Invalid trigger video:", validationError);
          return false;
        }
        const videoResult = await uploadFileClient("word-videos", file, "words", word.id, "trigger");
        if (videoResult.error || !videoResult.url) {
          console.error("Failed to upload video:", videoResult.error);
          return false;
        }
        const videoUrl = `${videoResult.url}?v=${Date.now()}`;

        let posterUrl: string | null = null;
        try {
          const poster = await generatePosterFromVideo(file);
          if (poster) {
            const posterResult = await uploadFileClient("word-images", poster, "words", word.id, "trigger");
            if (!posterResult.error && posterResult.url) {
              posterUrl = `${posterResult.url}?v=${Date.now()}`;
            }
          }
        } catch (err) {
          console.error("Failed to generate poster:", err);
        }

        const videoRes = await setWordVideoOverride(word.id, videoUrl);
        if (!videoRes.success) {
          console.error("Failed to set word video override:", videoRes.error);
          return false;
        }
        if (posterUrl) {
          const posterRes = await setWordImageOverride(word.id, posterUrl);
          if (!posterRes.success) {
            console.error("Failed to set poster override:", posterRes.error);
          }
        }

        setLocalWord((w) => ({
          ...w,
          memory_trigger_video_url: videoUrl,
          video_override_url: videoUrl,
          ...(posterUrl
            ? { memory_trigger_image_url: posterUrl, image_override_url: posterUrl }
            : {}),
        }));
        setImageContext((ctx) =>
          ctx
            ? {
                ...ctx,
                videoOverrideUrl: videoUrl,
                effectiveVideoUrl: videoUrl,
                ...(posterUrl
                  ? { imageOverrideUrl: posterUrl, effectiveImageUrl: posterUrl }
                  : {}),
              }
            : ctx
        );
        return true;
      }

      const uploadResult = await uploadFileClient("word-images", file, "words", word.id, "trigger");
      if (uploadResult.error || !uploadResult.url) {
        console.error("Failed to upload image:", uploadResult.error);
        return false;
      }
      const url = `${uploadResult.url}?v=${Date.now()}`;

      const result = await setWordImageOverride(word.id, url);
      if (!result.success) {
        console.error("Failed to set word image override:", result.error);
        return false;
      }
      setLocalWord((w) => ({ ...w, memory_trigger_image_url: url, image_override_url: url }));
      setImageContext((ctx) =>
        ctx ? { ...ctx, imageOverrideUrl: url, effectiveImageUrl: url } : ctx
      );
      return true;
    },
    [word.id]
  );

  // Replace the shared concept picture (group master). Fans out to member words
  // that have no override.
  const handleConceptImageUpload = useCallback(
    async (file: File): Promise<boolean> => {
      const groupId = imageContext?.imageGroupId;
      if (!groupId) return false;

      if (file.type === "video/mp4") {
        const validationError = validateTriggerVideo(file);
        if (validationError) {
          console.error("Invalid concept video:", validationError);
          return false;
        }
        const videoResult = await uploadFileClient("word-videos", file, "image-groups", groupId, "master");
        if (videoResult.error || !videoResult.url) {
          console.error("Failed to upload concept video:", videoResult.error);
          return false;
        }
        const videoUrl = `${videoResult.url}?v=${Date.now()}`;

        let posterUrl: string | null = null;
        try {
          const poster = await generatePosterFromVideo(file);
          if (poster) {
            const posterResult = await uploadFileClient("word-images", poster, "image-groups", groupId, "master");
            if (!posterResult.error && posterResult.url) {
              posterUrl = `${posterResult.url}?v=${Date.now()}`;
            }
          }
        } catch (err) {
          console.error("Failed to generate poster:", err);
        }

        const result = await updateImageGroup(groupId, {
          master_video_url: videoUrl,
          ...(posterUrl ? { master_image_url: posterUrl } : {}),
        });
        if (!result.success) {
          console.error("Failed to update concept video:", result.error);
          return false;
        }

        setLocalWord((w) =>
          w.image_group_id === groupId && !w.video_override_url
            ? {
                ...w,
                memory_trigger_video_url: videoUrl,
                ...(posterUrl && !w.image_override_url
                  ? { memory_trigger_image_url: posterUrl }
                  : {}),
              }
            : w
        );
        setImageContext((ctx) =>
          ctx
            ? {
                ...ctx,
                masterVideoUrl: videoUrl,
                effectiveVideoUrl: ctx.videoOverrideUrl ? ctx.effectiveVideoUrl : videoUrl,
                ...(posterUrl
                  ? {
                      masterImageUrl: posterUrl,
                      effectiveImageUrl: ctx.imageOverrideUrl ? ctx.effectiveImageUrl : posterUrl,
                    }
                  : {}),
              }
            : ctx
        );
        return true;
      }

      const uploadResult = await uploadFileClient("word-images", file, "image-groups", groupId, "master");
      if (uploadResult.error || !uploadResult.url) {
        console.error("Failed to upload concept image:", uploadResult.error);
        return false;
      }
      const url = `${uploadResult.url}?v=${Date.now()}`;

      const result = await updateImageGroup(groupId, { master_image_url: url });
      if (!result.success) {
        console.error("Failed to update concept image:", result.error);
        return false;
      }

      setLocalWord((w) =>
        w.image_group_id === groupId && !w.image_override_url
          ? { ...w, memory_trigger_image_url: url }
          : w
      );
      setImageContext((ctx) =>
        ctx
          ? {
              ...ctx,
              masterImageUrl: url,
              effectiveImageUrl: ctx.imageOverrideUrl ? ctx.effectiveImageUrl : url,
            }
          : ctx
      );
      return true;
    },
    [imageContext?.imageGroupId]
  );

  // Clear this word's overrides so it re-inherits the concept picture/video.
  const handleResetImageToConcept = useCallback(async (): Promise<boolean> => {
    const imageRes = await setWordImageOverride(word.id, null);
    if (!imageRes.success) {
      console.error("Failed to reset word image:", imageRes.error);
      return false;
    }
    const videoRes = await setWordVideoOverride(word.id, null);
    if (!videoRes.success) {
      console.error("Failed to reset word video:", videoRes.error);
      return false;
    }
    const master = imageContext?.masterImageUrl ?? null;
    const masterVideo = imageContext?.masterVideoUrl ?? null;
    setLocalWord((w) => ({
      ...w,
      memory_trigger_image_url: master,
      image_override_url: null,
      memory_trigger_video_url: masterVideo,
      video_override_url: null,
    }));
    setImageContext((ctx) =>
      ctx
        ? {
            ...ctx,
            imageOverrideUrl: null,
            effectiveImageUrl: master,
            videoOverrideUrl: null,
            effectiveVideoUrl: masterVideo,
          }
        : ctx
    );
    return true;
  }, [word.id, imageContext?.masterImageUrl, imageContext?.masterVideoUrl]);

  const [sizeKey, setSizeKey] = useState<SidebarSizeKey>(() => {
    if (typeof window === "undefined") return DEFAULT_SIZE;
    const stored = localStorage.getItem(STORAGE_KEY) as SidebarSizeKey | null;
    if (stored && SIDEBAR_SIZES.some((s) => s.key === stored)) return stored;
    return DEFAULT_SIZE;
  });

  const cycleSize = () => {
    const currentIndex = SIDEBAR_SIZES.findIndex((s) => s.key === sizeKey);
    const nextIndex = (currentIndex + 1) % SIDEBAR_SIZES.length;
    const nextKey = SIDEBAR_SIZES[nextIndex].key;
    setSizeKey(nextKey);
    localStorage.setItem(STORAGE_KEY, nextKey);
  };

  const { width: sidebarWidth, label: sizeLabel, Icon: SizeIcon } = getSizeConfig(sizeKey);

  // Slide-in/out animation
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  useLayoutEffect(() => {
    requestAnimationFrame(() => setEntered(true));
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }, [onClose]);

  const isVisible = entered && !closing;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft" && !e.altKey && !e.metaKey && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && !e.altKey && !e.metaKey && hasNext && onNext) {
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, onPrevious, onNext, hasPrevious, hasNext]);

  return (
    <>
      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
        className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-bone shadow-2xl transition-[width,transform] duration-300 ease-out max-md:!w-full ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-2">
            {showProgress ? (
              <div className="flex min-w-0 items-center overflow-hidden">
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  Word <span style={{ display: "inline-block", width: `${String(totalWords).length}ch`, textAlign: "right" }}>{currentIndex + 1}</span> of {totalWords}
                </span>
                <div
                  className={`flex min-w-0 items-center gap-1.5 overflow-hidden transition-[opacity,max-width,padding] duration-200 ${
                    sizeKey === "sm" ? "max-w-0 pl-0 opacity-0" : "max-w-[500px] pl-3 opacity-100"
                  }`}
                >
                  {Array.from({ length: totalWords }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (index !== currentIndex) {
                          onJumpToWord?.(index);
                        }
                      }}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        index === currentIndex
                          ? "bg-primary"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                      title={`Word ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            ) : (() => {
              const lessonChipContent = (
                <>
                  {lessonNumber > 0 && (
                    <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                      Lesson #{lessonNumber}
                    </span>
                  )}
                  {lessonTitle && (
                    <>
                      {lessonNumber > 0 && (
                        <span className="shrink-0 text-muted-foreground/50">·</span>
                      )}
                      <span className="truncate text-small-semibold text-foreground">
                        {lessonTitle}
                      </span>
                    </>
                  )}
                </>
              );
              const chipBaseClass =
                "-ml-2 flex min-w-0 items-center gap-1 rounded-lg px-2 py-1 transition-colors";
              return lessonId ? (
                <Link
                  href={`/lesson/${lessonId}`}
                  onClick={(e) => {
                    // Don't leave study/test mode without the exit warning.
                    if (exitGuard?.requestExit(`/lesson/${lessonId}`)) {
                      e.preventDefault();
                    }
                  }}
                  className={cn(chipBaseClass, "hover:bg-bone-hover")}
                >
                  {lessonChipContent}
                </Link>
              ) : (
                <div className={chipBaseClass}>{lessonChipContent}</div>
              );
            })()}

            <div className="flex shrink-0 items-center gap-1">
              {/* Size cycling is meaningless when the panel is full-width (mobile). */}
              <button
                onClick={cycleSize}
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-beige hover:text-foreground md:flex"
              >
                <SizeIcon className="h-4 w-4" />
              </button>
              <Tooltip label={t("tip_close")} position="below">
                <button
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-beige"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
          <WordDetailView
            word={localWord}
            lessonTitle={lessonTitle}
            lessonNumber={lessonNumber}
            lessons={lessons}
            onBack={handleClose}
            onPrevious={onPrevious}
            onNext={onNext}
            onJumpToWord={onJumpToWord}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            currentIndex={currentIndex}
            totalWords={totalWords}
            wordList={wordList}
            isAdmin={isAdmin}
            layout="sidebar"
            autoPlayAudio={false}
            isLocked={isLocked}
            replayRef={replayRef}
            imageMode={imageMode}
            onImageModeChange={setImageMode}
            onRelatedClick={openWord}
            isEditMode={isEditMode}
            onFieldSave={handleFieldSave}
            onArrayFieldSave={handleArrayFieldSave}
            onUploadEnglishAudio={(file) => handleAudioUpload("english", file)}
            onUploadForeignAudio={(file) => handleAudioUpload("foreign", file)}
            onUploadTriggerAudio={(file) => handleAudioUpload("trigger", file)}
            imageContext={imageContext}
            onWordImageUpload={handleWordImageUpload}
            onConceptImageUpload={handleConceptImageUpload}
            onResetImageToConcept={handleResetImageToConcept}
          />
        </div>

        {/* Footer Action Bar */}
        <WordDetailActionBar
          currentWordIndex={currentIndex}
          totalWords={totalWords}
          englishWord={localWord.english}
          foreignWord={localWord.headword}
          partOfSpeech={localWord.part_of_speech}
          gender={localWord.gender}
          category={localWord.category}
          wordList={wordList}
          testHistory={localWord.testHistory}
          scoreStats={localWord.scoreStats}
          onJumpToWord={onJumpToWord ?? (() => {})}
          onPreviousWord={onPrevious ?? (() => {})}
          onNextWord={onNext ?? (() => {})}
          onReplay={() => replayRef.current?.()}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          wordStatus={localWord.status}
          correctStreak={localWord.progress?.correct_streak ?? undefined}
          variant="sidebar"
          compact={sizeKey === "sm" || isMobile}
          imageMode={imageMode}
          onImageModeChange={setImageMode}
          isAdmin={isAdmin}
          isEditMode={isEditMode}
          onEditModeToggle={() => setIsEditMode((v) => !v)}
        />
      </div>
    </>
  );
}
