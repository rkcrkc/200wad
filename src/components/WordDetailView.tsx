"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { WordWithDetails } from "@/lib/queries/words";
import { useAudio } from "@/hooks/useAudio";
import { AudioButton } from "@/components/ui/audio-button";
import { saveUserNotes, saveSystemNotes } from "@/lib/mutations";
import { WordDetailActionBar } from "@/components/WordDetailActionBar";
import { FlashcardCard } from "@/components/study/FlashcardCard";

interface WordListItem {
  id: string;
  english: string;
  foreign: string;
}

interface WordDetailViewProps {
  word: WordWithDetails;
  lessonTitle: string;
  lessonNumber: number;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onJumpToWord?: (index: number) => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex: number;
  totalWords: number;
  /** List of all words for the word list dropdown */
  wordList: WordListItem[];
  /** Whether current user is an admin (can edit system notes) */
  isAdmin?: boolean;
  /** Whether accessed from dictionary (changes back button behavior) */
  fromDictionary?: boolean;
}

/**
 * Parse trigger text and highlight:
 * - English word: italic blue
 * - Foreign word or ALL CAPS phonetic match: green bold
 */
function parseAndHighlightText(
  text: string,
  englishWord: string,
  foreignWord: string,
  isPlaying: boolean
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const words = text.split(/(\s+)/);

  const cleanEnglish = englishWord.toLowerCase().replace(/[!?.,'"]/g, "");
  const cleanForeign = foreignWord.toLowerCase().replace(/[!?.,'"]/g, "");

  words.forEach((word, index) => {
    const cleanWord = word.toLowerCase().replace(/[!?.,'"]/g, "");

    if (cleanWord === cleanForeign || cleanWord.includes(cleanForeign)) {
      parts.push(
        <span key={index} className="font-bold" style={{ color: "#00C950" }}>
          {word}
        </span>
      );
    } else if (word.match(/^[A-Z]{2,}[!?.,'"]*$/) && word.trim().length > 1) {
      parts.push(
        <span key={index} className="font-bold" style={{ color: "#00C950" }}>
          {word}
        </span>
      );
    } else if (cleanWord === cleanEnglish || cleanWord.includes(cleanEnglish)) {
      parts.push(
        <span key={index} className="font-semibold italic" style={{ color: "#0B6CFF" }}>
          {word}
        </span>
      );
    } else {
      parts.push(
        <span key={index} style={{ color: isPlaying ? "#0B6CFF" : "#141515" }}>
          {word}
        </span>
      );
    }
  });

  return parts;
}

export function WordDetailView({
  word,
  lessonTitle,
  lessonNumber,
  onBack,
  onPrevious,
  onNext,
  onJumpToWord,
  hasPrevious = false,
  hasNext = false,
  currentIndex,
  totalWords,
  wordList,
  isAdmin = false,
  fromDictionary = false,
}: WordDetailViewProps) {
  const router = useRouter();
  const { playAudio, stopAudio, preloadAudio, currentAudioType } = useAudio();

  // Handle back navigation - go to dictionary if accessed from there
  const handleBackClick = useCallback(() => {
    if (fromDictionary) {
      router.back();
    } else {
      onBack();
    }
  }, [fromDictionary, router, onBack]);

  const isPlayingEnglish = currentAudioType === "english";
  const isPlayingForeign = currentAudioType === "foreign";
  const isPlayingTrigger = currentAudioType === "trigger";

  // User notes editing state
  const [isEditingUserNotes, setIsEditingUserNotes] = useState(false);
  const [userNotesInput, setUserNotesInput] = useState(word.progress?.user_notes || "");
  const [userNotes, setUserNotes] = useState(word.progress?.user_notes || null);

  // System notes editing state (admin only)
  const [isEditingSystemNotes, setIsEditingSystemNotes] = useState(false);
  const [systemNotesInput, setSystemNotesInput] = useState(word.notes || "");
  const [systemNotes, setSystemNotes] = useState(word.notes || null);

  // Image display mode state
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");

  // Audio sequence state
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const audioSequenceCancelledRef = useRef(false);

  // Reset notes state when word changes
  useEffect(() => {
    setUserNotesInput(word.progress?.user_notes || "");
    setUserNotes(word.progress?.user_notes || null);
    setIsEditingUserNotes(false);
    setSystemNotesInput(word.notes || "");
    setSystemNotes(word.notes || null);
    setIsEditingSystemNotes(false);
  }, [word.id, word.progress?.user_notes, word.notes]);

  // User notes handlers
  const handleSaveUserNotes = async () => {
    const trimmedNotes = userNotesInput.trim() || null;
    setUserNotes(trimmedNotes);
    setIsEditingUserNotes(false);
    await saveUserNotes(word.id, trimmedNotes);
  };

  const handleCancelUserNotes = () => {
    setUserNotesInput(userNotes || "");
    setIsEditingUserNotes(false);
  };

  // System notes handlers (admin only)
  const handleSaveSystemNotes = async () => {
    const trimmedNotes = systemNotesInput.trim() || null;
    setSystemNotes(trimmedNotes);
    setIsEditingSystemNotes(false);
    await saveSystemNotes(word.id, trimmedNotes);
  };

  const handleCancelSystemNotes = () => {
    setSystemNotesInput(systemNotes || "");
    setIsEditingSystemNotes(false);
  };

  // Preload audio on mount
  useEffect(() => {
    preloadAudio([
      word.audio_url_english,
      word.audio_url_foreign,
      word.audio_url_trigger,
    ]);
  }, [word, preloadAudio]);

  // Auto-play audio sequence when word changes: English → Foreign → Trigger → Foreign
  useEffect(() => {
    audioSequenceCancelledRef.current = false;
    setIsPlayingSequence(true);

    const playSequence = async () => {
      // Play English
      if (word.audio_url_english && !audioSequenceCancelledRef.current) {
        await playAudio(word.audio_url_english, "english");
      }
      if (audioSequenceCancelledRef.current) return;

      // Play Foreign
      if (word.audio_url_foreign && !audioSequenceCancelledRef.current) {
        await playAudio(word.audio_url_foreign, "foreign");
      }
      if (audioSequenceCancelledRef.current) return;

      // Play Trigger
      if (word.audio_url_trigger && !audioSequenceCancelledRef.current) {
        await playAudio(word.audio_url_trigger, "trigger");
      }
      if (audioSequenceCancelledRef.current) return;

      // Play Foreign again
      if (word.audio_url_foreign && !audioSequenceCancelledRef.current) {
        await playAudio(word.audio_url_foreign, "foreign");
      }

      setIsPlayingSequence(false);
    };

    playSequence();

    return () => {
      audioSequenceCancelledRef.current = true;
      stopAudio();
      setIsPlayingSequence(false);
    };
  }, [word.id, word.audio_url_english, word.audio_url_foreign, word.audio_url_trigger, playAudio, stopAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioSequenceCancelledRef.current = true;
      stopAudio();
    };
  }, [stopAudio]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // If audio is playing, stop it first
        if (isPlayingSequence) {
          audioSequenceCancelledRef.current = true;
          stopAudio();
          setIsPlayingSequence(false);
        } else {
          // If no audio playing, go back
          handleBackClick();
        }
      } else if (e.key === "ArrowLeft" && hasPrevious && onPrevious) {
        audioSequenceCancelledRef.current = true;
        stopAudio();
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext && onNext) {
        audioSequenceCancelledRef.current = true;
        stopAudio();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBackClick, onPrevious, onNext, hasPrevious, hasNext, stopAudio, isPlayingSequence]);

  const handlePlayEnglish = useCallback(() => {
    if (word.audio_url_english) {
      playAudio(word.audio_url_english, "english");
    }
  }, [word.audio_url_english, playAudio]);

  const handlePlayForeign = useCallback(() => {
    if (word.audio_url_foreign) {
      playAudio(word.audio_url_foreign, "foreign");
    }
  }, [word.audio_url_foreign, playAudio]);

  const handlePlayTrigger = useCallback(() => {
    if (word.audio_url_trigger) {
      playAudio(word.audio_url_trigger, "trigger");
    }
  }, [word.audio_url_trigger, playAudio]);

  const hasMemoryTrigger = word.memory_trigger_image_url || word.memory_trigger_text;

  // Handler for replay button in action bar - plays full sequence
  const handleReplay = useCallback(async () => {
    // Cancel any existing sequence first
    audioSequenceCancelledRef.current = true;
    stopAudio();

    // Start new sequence
    audioSequenceCancelledRef.current = false;
    setIsPlayingSequence(true);

    // Play English
    if (word.audio_url_english && !audioSequenceCancelledRef.current) {
      await playAudio(word.audio_url_english, "english");
    }
    if (audioSequenceCancelledRef.current) {
      setIsPlayingSequence(false);
      return;
    }

    // Play Foreign
    if (word.audio_url_foreign && !audioSequenceCancelledRef.current) {
      await playAudio(word.audio_url_foreign, "foreign");
    }
    if (audioSequenceCancelledRef.current) {
      setIsPlayingSequence(false);
      return;
    }

    // Play Trigger
    if (word.audio_url_trigger && !audioSequenceCancelledRef.current) {
      await playAudio(word.audio_url_trigger, "trigger");
    }
    if (audioSequenceCancelledRef.current) {
      setIsPlayingSequence(false);
      return;
    }

    // Play Foreign again
    if (word.audio_url_foreign && !audioSequenceCancelledRef.current) {
      await playAudio(word.audio_url_foreign, "foreign");
    }

    setIsPlayingSequence(false);
  }, [word.audio_url_english, word.audio_url_foreign, word.audio_url_trigger, playAudio, stopAudio]);

  // Handler for navigation that stops audio first
  const handlePrevious = useCallback(() => {
    audioSequenceCancelledRef.current = true;
    stopAudio();
    onPrevious?.();
  }, [stopAudio, onPrevious]);

  const handleNext = useCallback(() => {
    audioSequenceCancelledRef.current = true;
    stopAudio();
    onNext?.();
  }, [stopAudio, onNext]);

  const handleJumpToWord = useCallback((index: number) => {
    audioSequenceCancelledRef.current = true;
    stopAudio();
    onJumpToWord?.(index);
  }, [stopAudio, onJumpToWord]);

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Navigation row: back button + word dots (if not from dictionary) */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {fromDictionary ? "Dictionary" : `#${lessonNumber} ${lessonTitle}`}
        </button>

        {/* Word tracker dots with arrows - hidden when from dictionary */}
        {!fromDictionary && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Word {currentIndex + 1} of {totalWords}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous word"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalWords }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (index !== currentIndex) {
                        handleJumpToWord(index);
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

              <button
                onClick={handleNext}
                disabled={!hasNext}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next word"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Word Card */}
      <div className="w-full rounded-2xl bg-white p-6 shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
        <div className="flex flex-col gap-4">
          {/* English word */}
          <button
            onClick={handlePlayEnglish}
            className="flex cursor-pointer items-center gap-4 rounded-lg text-left"
          >
            <AudioButton isPlaying={isPlayingEnglish} />
            <span
              className="text-[32px] font-semibold leading-tight tracking-tight"
              style={{ color: isPlayingEnglish ? "#00C950" : "#141515" }}
            >
              {word.english}
            </span>
          </button>

          <div className="h-px w-full bg-black/10" />

          {/* Foreign word */}
          <button
            onClick={handlePlayForeign}
            className="flex cursor-pointer items-center gap-4 rounded-lg text-left"
          >
            <AudioButton isPlaying={isPlayingForeign} />
            <span
              className="text-[32px] font-semibold leading-tight tracking-tight"
              style={{ color: isPlayingForeign ? "#00C950" : "#141515" }}
            >
              {word.headword}
            </span>
          </button>
        </div>
      </div>

      {/* Two columns layout */}
      <div className="flex gap-6">
        {/* Left column - Memory Trigger or Flashcard */}
        <div className="flex w-[55%] flex-col gap-6">
          {imageMode === "memory-trigger" ? (
            // Memory Trigger mode
            hasMemoryTrigger && (
              <div className="w-full rounded-2xl bg-white shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
                <div className="flex flex-col gap-5 p-6">
                  {/* Trigger text */}
                  {word.memory_trigger_text && (
                    <button
                      onClick={handlePlayTrigger}
                      className="flex cursor-pointer items-center gap-4 text-left"
                    >
                      <AudioButton isPlaying={isPlayingTrigger} />
                      <p className="text-xl font-medium leading-relaxed">
                        {parseAndHighlightText(
                          word.memory_trigger_text,
                          word.english,
                          word.headword,
                          isPlayingTrigger
                        )}
                      </p>
                    </button>
                  )}

                  {/* Trigger image */}
                  {word.memory_trigger_image_url && (
                    <button
                      onClick={handlePlayTrigger}
                      className="relative h-[300px] w-full cursor-pointer overflow-hidden rounded-lg"
                    >
                      <Image
                        src={word.memory_trigger_image_url}
                        alt="Memory trigger"
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 500px"
                      />
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            // Flashcard mode
            <FlashcardCard
              imageUrl={word.flashcard_image_url || null}
              englishWord={word.english}
              isVisible={true}
            />
          )}
        </div>

        {/* Right column - Notes, Examples, Related */}
        <div className="flex flex-1 flex-col gap-6">
          {/* Notes - always show */}
          <div className="w-full rounded-2xl bg-white p-6 shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
            <span className="mb-4 block text-xs font-medium uppercase tracking-wide text-foreground/50">
              NOTES
            </span>
            <div className="flex flex-col gap-4">
              {/* System notes */}
              {isEditingSystemNotes ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={systemNotesInput}
                    onChange={(e) => setSystemNotesInput(e.target.value)}
                    placeholder="Add system notes..."
                    className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSystemNotes}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelSystemNotes}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : systemNotes ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{systemNotes}</p>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSystemNotesInput(systemNotes);
                        setIsEditingSystemNotes(true);
                      }}
                      className="self-start text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
                    >
                      Edit
                    </button>
                  )}
                </div>
              ) : isAdmin ? (
                <button
                  onClick={() => setIsEditingSystemNotes(true)}
                  className="self-start text-sm text-foreground/50 transition-colors hover:text-foreground"
                >
                  + Add system notes
                </button>
              ) : null}

              {(systemNotes || userNotes || isEditingUserNotes || isEditingSystemNotes) && (
                <div className="h-px w-full bg-black/10" />
              )}

              {/* User notes section */}
              {isEditingUserNotes ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={userNotesInput}
                    onChange={(e) => setUserNotesInput(e.target.value)}
                    placeholder="Add your notes here..."
                    className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveUserNotes}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelUserNotes}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : userNotes ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{userNotes}</p>
                  <button
                    onClick={() => {
                      setUserNotesInput(userNotes);
                      setIsEditingUserNotes(true);
                    }}
                    className="self-start text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingUserNotes(true)}
                  className="self-start text-sm text-foreground/50 transition-colors hover:text-foreground"
                >
                  + Add notes
                </button>
              )}
            </div>
          </div>

          {/* Example Sentences */}
          {word.exampleSentences && word.exampleSentences.length > 0 && (
            <div className="w-full rounded-2xl bg-white p-6 shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
              <span className="mb-4 block text-xs font-medium uppercase tracking-wide text-foreground/50">
                EXAMPLE SENTENCES
              </span>
              <div className="flex flex-col gap-4">
                {word.exampleSentences.map((sentence, index) => (
                  <div key={sentence.id}>
                    <div className="flex items-start gap-4">
                      {sentence.thumbnail_image_url && (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={sentence.thumbnail_image_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-1">
                        <p className="text-sm text-foreground">{sentence.foreign_sentence}</p>
                        <p className="text-sm text-foreground/60">{sentence.english_sentence}</p>
                      </div>
                    </div>
                    {index < word.exampleSentences.length - 1 && (
                      <div className="mt-4 h-px w-full bg-black/10" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Words */}
          {word.relatedWords && word.relatedWords.length > 0 && (
            <div className="w-full rounded-2xl bg-white p-6 shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
              <span className="mb-4 block text-xs font-medium uppercase tracking-wide text-foreground/50">
                RELATED WORDS
              </span>
              <div className="flex flex-col gap-4">
                {word.relatedWords.map((related, index) => (
                  <div key={related.id}>
                    <div className="flex items-center gap-4">
                      {related.memory_trigger_image_url ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={related.memory_trigger_image_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl">
                          🗣️
                        </div>
                      )}
                      <div className="flex flex-1 flex-col">
                        <p className="text-sm text-foreground">{related.english}</p>
                        <p className="text-sm text-foreground/60">{related.headword}</p>
                      </div>
                    </div>
                    {index < word.relatedWords.length - 1 && (
                      <div className="mt-4 h-px w-full bg-black/10" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Bar */}
      <WordDetailActionBar
        currentWordIndex={currentIndex}
        totalWords={totalWords}
        englishWord={word.english}
        foreignWord={word.headword}
        partOfSpeech={word.part_of_speech}
        wordList={wordList}
        testHistory={word.testHistory}
        scoreStats={word.scoreStats}
        onJumpToWord={handleJumpToWord}
        onPreviousWord={handlePrevious}
        onNextWord={handleNext}
        onReplay={handleReplay}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        imageMode={imageMode}
        onImageModeChange={setImageMode}
        fromDictionary={fromDictionary}
      />
    </div>
  );
}
