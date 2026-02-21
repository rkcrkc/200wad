"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Course, Language, Lesson } from "@/types/database";
import { WordWithDetails, type AdjacentLesson } from "@/lib/queries/words";
import { useAudio, AudioType } from "@/hooks/useAudio";
import {
  StudyNavbar,
  StudyActionBar,
  WordCard,
  MemoryTriggerCard,
  StudySidebar,
  AnswerInput,
  LessonCompletedModal,
} from "@/components/study";
import { useSetCourseContext } from "@/context/CourseContext";
import { getFlagFromCode } from "@/lib/utils/flags";
import {
  createStudySession,
  completeStudySession,
} from "@/lib/mutations/study";
import {
  initSessionProgress,
  updateWordProgress as updateWordProgressStorage,
  saveSessionProgress,
  getSessionProgress,
  clearSessionProgress,
  getIncompleteSessionId,
  type WordProgressEntry,
} from "@/lib/utils/sessionStorage";

type StudyPhase =
  | "reveal-first"
  | "reveal-second"
  | "show-memory-trigger"
  | "show-input"
  | "show-feedback";

interface WordProgress {
  isCorrect: boolean;
  userNotes: string | null;
  hasAnswered: boolean;
}

interface StudyModeClientProps {
  lesson: Lesson;
  language: Language | null;
  course: Course | null;
  words: WordWithDetails[];
  isGuest: boolean;
  courseLessons?: AdjacentLesson[];
}

export function StudyModeClient({
  lesson,
  language,
  course,
  words,
  isGuest,
  courseLessons = [],
}: StudyModeClientProps) {
  const router = useRouter();
  const { playAudio, stopAudio, currentAudioType } = useAudio();

  const languageFlag = getFlagFromCode(language?.code);

  // Set course context for the sidebar
  useSetCourseContext({
    languageId: language?.id,
    languageFlag,
    languageName: language?.name,
    courseId: course?.id,
    courseName: course?.name,
  });

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Word navigation state
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [phase, setPhase] = useState<StudyPhase>("reveal-first");

  // Progress tracking (keyed by word ID)
  const [wordProgressMap, setWordProgressMap] = useState<Map<string, WordProgress>>(
    new Map()
  );
  const [completedWordIndices, setCompletedWordIndices] = useState<number[]>([]);
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Refs for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentWord = words[currentWordIndex];
  const isLastWord = currentWordIndex === words.length - 1;

  // Initialize study session and check for incomplete sessions
  useEffect(() => {
    const initSession = async () => {
      // Check for incomplete session in localStorage
      const existingSessionId = getIncompleteSessionId("study", lesson.id);
      
      if (existingSessionId) {
        // Restore from localStorage
        const storedProgress = getSessionProgress("study", existingSessionId);
        if (storedProgress) {
          console.log("[Study] Restoring session from localStorage:", existingSessionId);
          setSessionId(existingSessionId);
          setCurrentWordIndex(storedProgress.currentWordIndex);
          
          // Restore word progress
          const restoredMap = new Map<string, WordProgress>();
          Object.entries(storedProgress.wordProgress).forEach(([wordId, entry]) => {
            restoredMap.set(wordId, {
              isCorrect: entry.isCorrect,
              userNotes: entry.userNotes,
              hasAnswered: true,
            });
          });
          setWordProgressMap(restoredMap);
          
          // Restore completed indices
          const completedIndices = words
            .map((w, i) => (storedProgress.wordProgress[w.id] ? i : -1))
            .filter((i) => i !== -1);
          setCompletedWordIndices(completedIndices);
          
          return;
        }
      }

      // Create new session - always initialize localStorage first
      let newSessionId: string;
      
      if (!isGuest) {
        // Try to create a DB session
        const result = await createStudySession(lesson.id);
        if (result.sessionId) {
          newSessionId = result.sessionId;
          console.log("[Study] Created DB session:", newSessionId);
        } else {
          // Fallback to local-only session if DB fails
          newSessionId = `local_${lesson.id}_${Date.now()}`;
          console.log("[Study] DB session failed, using local:", newSessionId, result.error);
        }
      } else {
        // Guest users get a local-only session ID
        newSessionId = `guest_${lesson.id}_${Date.now()}`;
        console.log("[Study] Guest session:", newSessionId);
      }
      
      setSessionId(newSessionId);
      initSessionProgress("study", newSessionId, lesson.id);
    };

    initSession();
  }, [lesson.id, isGuest, words]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
    };
  }, [stopAudio]);

  // Save progress to localStorage whenever word index changes
  useEffect(() => {
    if (!sessionId) return;
    
    // Convert Map to Record for storage
    const wordProgressRecord: Record<string, WordProgressEntry> = {};
    wordProgressMap.forEach((progress, wordId) => {
      if (progress.hasAnswered) {
        wordProgressRecord[wordId] = {
          isCorrect: progress.isCorrect,
          userNotes: progress.userNotes,
          answeredAt: new Date().toISOString(),
        };
      }
    });
    
    saveSessionProgress("study", sessionId, lesson.id, currentWordIndex, wordProgressRecord);
  }, [sessionId, lesson.id, currentWordIndex, wordProgressMap]);

  // Phase auto-advance with audio
  useEffect(() => {
    const advancePhase = async () => {
      if (phase === "reveal-first") {
        // Play English audio, then advance after 1s delay
        if (currentWord.audio_url_english) {
          await playAudio(currentWord.audio_url_english, "english");
        }
        phaseTimeoutRef.current = setTimeout(() => {
          setPhase("reveal-second");
        }, 1000);
      } else if (phase === "reveal-second") {
        // Play Foreign audio, then advance after 1s delay
        if (currentWord.audio_url_foreign) {
          await playAudio(currentWord.audio_url_foreign, "foreign");
        }
        phaseTimeoutRef.current = setTimeout(() => {
          setPhase("show-memory-trigger");
        }, 1000);
      } else if (phase === "show-memory-trigger") {
        // Play Trigger audio, then advance after 1s delay
        if (currentWord.audio_url_trigger) {
          await playAudio(currentWord.audio_url_trigger, "trigger");
        }
        phaseTimeoutRef.current = setTimeout(() => {
          setPhase("show-input");
        }, 1000);
      }
    };

    advancePhase();

    return () => {
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
    };
  }, [phase, currentWord, playAudio]);

  // Handle answer submission
  const handleSubmit = useCallback(
    (isCorrect: boolean, userAnswer: string) => {
      const existingNotes = wordProgressMap.get(currentWord.id)?.userNotes || null;
      
      setWordProgressMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(currentWord.id, {
          isCorrect,
          userNotes: existingNotes,
          hasAnswered: true,
        });
        return newMap;
      });
      
      // Save to localStorage
      if (sessionId) {
        const progressEntry: WordProgressEntry = {
          isCorrect,
          userNotes: existingNotes,
          answeredAt: new Date().toISOString(),
        };
        updateWordProgressStorage("study", sessionId, currentWord.id, progressEntry, currentWordIndex);
      }
      
      setPhase("show-feedback");
    },
    [currentWord.id, currentWordIndex, sessionId, wordProgressMap]
  );

  // Handle next word
  const handleNextWord = useCallback(() => {
    // Mark current word as completed
    if (!completedWordIndices.includes(currentWordIndex)) {
      setCompletedWordIndices((prev) => [...prev, currentWordIndex]);
    }

    if (isLastWord) {
      // Finish lesson
      handleFinishLesson();
    } else {
      // Move to next word
      setCurrentWordIndex((prev) => prev + 1);
      setPhase("reveal-first");
    }
  }, [currentWordIndex, isLastWord, completedWordIndices]);

  // Handle jump to word
  const handleJumpToWord = useCallback(
    (index: number) => {
      if (index !== currentWordIndex && index >= 0 && index < words.length) {
        stopAudio();
        if (phaseTimeoutRef.current) {
          clearTimeout(phaseTimeoutRef.current);
        }
        setCurrentWordIndex(index);
        setPhase("reveal-first");
      }
    },
    [currentWordIndex, words.length, stopAudio]
  );

  // Handle user notes change
  const handleUserNotesChange = useCallback(
    (notes: string | null) => {
      const existing = wordProgressMap.get(currentWord.id);
      
      setWordProgressMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(currentWord.id, {
          isCorrect: existing?.isCorrect || false,
          userNotes: notes,
          hasAnswered: existing?.hasAnswered || false,
        });
        return newMap;
      });
      
      // Save notes to localStorage if session exists and word was answered
      if (sessionId && existing?.hasAnswered) {
        const progressEntry: WordProgressEntry = {
          isCorrect: existing.isCorrect,
          userNotes: notes,
          answeredAt: new Date().toISOString(),
        };
        updateWordProgressStorage("study", sessionId, currentWord.id, progressEntry, currentWordIndex);
      }
    },
    [currentWord.id, currentWordIndex, sessionId, wordProgressMap]
  );

  // Handle finish lesson - save to DB and show completion modal
  const handleFinishLesson = useCallback(async () => {
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (!isGuest && sessionId) {
      // Prepare updates - include words that were answered OR have notes edited
      const pendingUpdates = Array.from(wordProgressMap.entries())
        .filter(([_, progress]) => progress.hasAnswered || progress.userNotes !== null)
        .map(([wordId, progress]) => ({
          wordId,
          isCorrect: progress.isCorrect,
          userNotes: progress.userNotes,
          hasAnswered: progress.hasAnswered,
        }));

      // Only count answered words for stats
      const answeredUpdates = pendingUpdates.filter((u) => u.hasAnswered);
      const wordsStudied = answeredUpdates.length;
      const wordsMastered = answeredUpdates.filter((u) => u.isCorrect).length;

      const result = await completeStudySession(sessionId, lesson.id, {
        wordsStudied,
        wordsMastered,
        durationSeconds: elapsedSeconds,
      }, pendingUpdates);
      
      if (result.success) {
        // Clear localStorage after successful DB sync
        clearSessionProgress("study", sessionId, lesson.id);
      } else {
        console.error("Failed to complete study session:", result.error);
      }
    }

    // Show completion modal
    setShowCompletionModal(true);
  }, [isGuest, sessionId, lesson.id, wordProgressMap, elapsedSeconds]);

  // Handle modal "Start Test" action
  const handleStartTest = useCallback(() => {
    // TODO: Navigate to test mode when implemented
    router.push(`/lesson/${lesson.id}`);
  }, [router, lesson.id]);

  // Handle modal "Not now" action
  const handleDismissModal = useCallback(() => {
    router.push(`/lesson/${lesson.id}`);
  }, [router, lesson.id]);

  // Handle exit lesson
  const handleExitLesson = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to exit? Your progress will be saved."
    );
    if (confirmed) {
      handleFinishLesson();
    }
  }, [handleFinishLesson]);

  // Handle restart current word
  const handleRestart = useCallback(() => {
    stopAudio();
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
    }
    setPhase("reveal-first");
  }, [stopAudio]);

  // Get current word's user notes from progress map
  const currentWordProgress = wordProgressMap.get(currentWord.id);
  const currentUserNotes = currentWordProgress?.userNotes || currentWord.progress?.user_notes || null;

  // Determine what to show based on phase
  const showForeign = phase !== "reveal-first";
  const showTrigger =
    phase === "show-memory-trigger" ||
    phase === "show-input" ||
    phase === "show-feedback";
  const showInput = phase === "show-input" || phase === "show-feedback";
  const sidebarEnabled = phase === "show-input" || phase === "show-feedback";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main content area - no sidebar in study mode */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Custom navbar (replaces default header) */}
        <StudyNavbar
          languageFlag={languageFlag}
          courseName={course?.name}
          elapsedSeconds={elapsedSeconds}
          onExitLesson={handleExitLesson}
          lessonNumber={lesson.number}
          lessonTitle={lesson.title}
        />

        {/* Scrollable content: WordCard full width, then two columns (pt for fixed navbar) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[160px] pt-[96px]">
          <div className="mx-auto w-full max-w-content-lg flex flex-col gap-6">
            {/* Word Card - full width */}
            <div className="w-full">
              <WordCard
                partOfSpeech={currentWord.part_of_speech}
                englishWord={currentWord.english}
                foreignWord={currentWord.headword}
                showForeign={showForeign}
                playingAudioType={currentAudioType}
                onPlayEnglishAudio={() => {
                  if (currentWord.audio_url_english) {
                    playAudio(currentWord.audio_url_english, "english");
                  }
                }}
                onPlayForeignAudio={() => {
                  if (currentWord.audio_url_foreign) {
                    playAudio(currentWord.audio_url_foreign, "foreign");
                  }
                }}
              />
            </div>

            {/* Two columns: Memory Trigger (left), Notes/Sentences (right) */}
            <div className="flex gap-6">
              <div className="flex w-[700px] flex-col gap-6">
                <MemoryTriggerCard
                  imageUrl={currentWord.memory_trigger_image_url}
                  triggerText={currentWord.memory_trigger_text}
                  englishWord={currentWord.english}
                  foreignWord={currentWord.headword}
                  isVisible={showTrigger}
                  playingAudioType={currentAudioType}
                  onPlayTriggerAudio={() => {
                    if (currentWord.audio_url_trigger) {
                      playAudio(currentWord.audio_url_trigger, "trigger");
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <StudySidebar
                  systemNotes={currentWord.notes}
                  userNotes={currentUserNotes}
                  exampleSentences={currentWord.exampleSentences}
                  relatedWords={currentWord.relatedWords}
                  isEnabled={sidebarEnabled}
                  onUserNotesChange={handleUserNotesChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom container - stacked input and action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white shadow-[0px_-8px_30px_-15px_rgba(0,0,0,0.1)]">
          {/* Answer Input Row */}
          <AnswerInput
            languageName={language?.name || "Italian"}
            languageFlag={languageFlag}
            validAnswers={[currentWord.headword, ...(currentWord.alternate_answers || [])]}
            isVisible={showInput}
            isLastWord={isLastWord}
            onSubmit={handleSubmit}
            onNextWord={handleNextWord}
          />

          {/* Action Bar Row */}
          <StudyActionBar
            currentWordIndex={currentWordIndex}
            totalWords={words.length}
            completedWords={completedWordIndices}
            testHistory={currentWord.testHistory}
            onJumpToWord={handleJumpToWord}
            onPreviousWord={() => handleJumpToWord(currentWordIndex - 1)}
            onNextWord={() => handleJumpToWord(currentWordIndex + 1)}
            onRestart={handleRestart}
          />
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <LessonCompletedModal
          lesson={lesson}
          words={words}
          wordProgressMap={wordProgressMap}
          elapsedSeconds={elapsedSeconds}
          onStartTest={handleStartTest}
          onDismiss={handleDismissModal}
        />
      )}
    </div>
  );
}
