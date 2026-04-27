"use client";

import { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { X, ChevronsRightLeft, ChevronsLeftRight } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { WordDetailView } from "@/components/WordDetailView";
import { WordDetailActionBar } from "@/components/WordDetailActionBar";
import type { AdjacentLesson, WordWithDetails } from "@/lib/queries/words";
import { useText } from "@/context/TextContext";
import { cn } from "@/lib/utils";

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
}: WordDetailSidebarProps) {
  const { t, tt } = useText();
  const sidebarRef = useRef<HTMLDivElement>(null);

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
        className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-bone shadow-2xl transition-[width,transform] duration-300 ease-out ${
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
                  className={cn(chipBaseClass, "hover:bg-bone-hover")}
                >
                  {lessonChipContent}
                </Link>
              ) : (
                <div className={chipBaseClass}>{lessonChipContent}</div>
              );
            })()}

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={cycleSize}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-beige hover:text-foreground"
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
            word={word}
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
          />
        </div>

        {/* Footer Action Bar */}
        <WordDetailActionBar
          currentWordIndex={currentIndex}
          totalWords={totalWords}
          englishWord={word.english}
          foreignWord={word.headword}
          partOfSpeech={word.part_of_speech}
          gender={word.gender}
          category={word.category}
          wordList={wordList}
          testHistory={word.testHistory}
          scoreStats={word.scoreStats}
          onJumpToWord={onJumpToWord ?? (() => {})}
          onPreviousWord={onPrevious ?? (() => {})}
          onNextWord={onNext ?? (() => {})}
          onReplay={() => {}}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          wordStatus={word.status}
          variant="sidebar"
          compact={sizeKey === "sm"}
        />
      </div>
    </>
  );
}
