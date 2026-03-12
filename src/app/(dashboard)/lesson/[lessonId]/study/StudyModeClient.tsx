"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Course, Language, Lesson } from "@/types/database";
import { WordWithDetails, type AdjacentLesson } from "@/lib/queries/words";
import { useAudio, AudioType } from "@/hooks/useAudio";
import { useStudyMusic } from "@/hooks/useStudyMusic";
import {
  StudyNavbar,
  StudyActionBar,
  WordCard,
  MemoryTriggerCard,
  FlashcardCard,
  StudySidebar,
  AnswerInput,
  LessonCompletedModal,
  type AnswerInputHandle,
  type BreathingPhase,
} from "@/components/study";
import { useSetCourseContext } from "@/context/CourseContext";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { getFlagFromCode } from "@/lib/utils/flags";
import {
  createStudySession,
  completeStudySession,
  saveUserNotes,
  saveSystemNotes,
} from "@/lib/mutations/study";
import { updateWord } from "@/lib/mutations/admin/words";
import { uploadFileClient } from "@/lib/supabase/storage.client";
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
  const { isAdmin } = useUser();
  const { playAudio, stopAudio, preloadAudio, currentAudioType } = useAudio();
  const {
    isEnabled: musicEnabled,
    setEnabled: setMusicEnabled,
    selectedTrack,
    setSelectedTrack,
    volume: musicVolume,
    setVolume: setMusicVolume,
    hasError: musicHasError,
    stop: stopMusic,
  } = useStudyMusic();

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
  const [viewedWordIndices, setViewedWordIndices] = useState<number[]>([0]); // Start with first word viewed
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Exit confirmation modal state
  const [showExitModal, setShowExitModal] = useState(false);

  // Strict study mode state
  const [strictMode, setStrictMode] = useState(false);

  // Image display mode (memory trigger vs flashcard)
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");

  // Admin edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  // Breathing mode state (persisted to localStorage)
  const [breathingModeEnabled, setBreathingModeEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("study-breathing-mode") === "true";
  });
  const [breathingPhase, setBreathingPhase] = useState<BreathingPhase | null>(null);
  const [breathingSecond, setBreathingSecond] = useState(0);
  const [breathingCycleTrigger, setBreathingCycleTrigger] = useState(0); // Incremented on restart

  // Persist breathing mode preference
  useEffect(() => {
    localStorage.setItem("study-breathing-mode", breathingModeEnabled.toString());
  }, [breathingModeEnabled]);

  // Idle/pause state
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const IDLE_TIMEOUT_MS = 60 * 1000; // 1 minute

  // Refs for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const answerInputRef = useRef<AnswerInputHandle>(null);

  const currentWord = words[currentWordIndex];
  const isLastWord = currentWordIndex === words.length - 1;

  // Initialize study session (always fresh - study mode is sandboxed)
  useEffect(() => {
    const initSession = async () => {
      // Clear any stale session data from previous incomplete sessions
      const existingSessionId = getIncompleteSessionId("study", lesson.id);
      if (existingSessionId) {
        clearSessionProgress("study", existingSessionId, lesson.id);
      }

      // Create new session - always start fresh
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
  }, [lesson.id, isGuest]);

  // Preload audio for current word (and next word for smoother transitions)
  useEffect(() => {
    const urlsToPreload = [
      currentWord.audio_url_english,
      currentWord.audio_url_foreign,
      currentWord.audio_url_trigger,
    ];

    // Also preload next word's audio if available
    const nextWord = words[currentWordIndex + 1];
    if (nextWord) {
      urlsToPreload.push(
        nextWord.audio_url_english,
        nextWord.audio_url_foreign,
        nextWord.audio_url_trigger
      );
    }

    preloadAudio(urlsToPreload);
  }, [currentWord, currentWordIndex, words, preloadAudio]);

  // Timer (pauses when idle or lesson complete)
  useEffect(() => {
    if (isTimerPaused || showCompletionModal) {
      // Clear interval when paused or lesson complete
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerPaused, showCompletionModal]);

  // Idle detection - pause timer after 1 minute of inactivity
  useEffect(() => {
    const startIdleTimer = () => {
      // Clear existing idle timeout
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      // Set new idle timeout
      idleTimeoutRef.current = setTimeout(() => {
        setIsTimerPaused(true);
      }, IDLE_TIMEOUT_MS);
    };

    const handleActivity = () => {
      // Resume timer if paused, then restart idle countdown
      setIsTimerPaused(false);
      startIdleTimer();
    };

    // Activity events to listen for
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

    // Add listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Start initial idle timer
    startIdleTimer();

    return () => {
      // Cleanup listeners
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []); // Empty deps - only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      stopMusic();
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
    };
  }, [stopAudio, stopMusic]);

  // Warn user before leaving/refreshing the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages, but this triggers the dialog
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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

  // Phase auto-advance with audio (only when breathing mode is OFF)
  useEffect(() => {
    // Skip if breathing mode is enabled - it has its own timing
    if (breathingModeEnabled) return;

    let cancelled = false;
    console.log(`[Phase Effect] Running for phase: ${phase}, word: ${currentWord.english}`);

    const advancePhase = async () => {
      if (phase === "reveal-first") {
        console.log(`[Phase] reveal-first - playing English audio`);
        if (currentWord.audio_url_english) {
          await playAudio(currentWord.audio_url_english, "english");
          console.log(`[Phase] English audio finished`);
        }
        if (cancelled) {
          console.log(`[Phase] Cancelled after English audio`);
          return;
        }
        phaseTimeoutRef.current = setTimeout(() => {
          console.log(`[Phase] Advancing to reveal-second`);
          setPhase("reveal-second");
        }, 50);
      } else if (phase === "reveal-second") {
        console.log(`[Phase] reveal-second - playing Foreign audio`);
        if (currentWord.audio_url_foreign) {
          await playAudio(currentWord.audio_url_foreign, "foreign");
          console.log(`[Phase] Foreign audio finished`);
        }
        if (cancelled) {
          console.log(`[Phase] Cancelled after Foreign audio`);
          return;
        }
        phaseTimeoutRef.current = setTimeout(() => {
          console.log(`[Phase] Advancing to show-memory-trigger`);
          setPhase("show-memory-trigger");
        }, 50);
      } else if (phase === "show-memory-trigger") {
        console.log(`[Phase] show-memory-trigger - playing Trigger audio`);
        if (currentWord.audio_url_trigger) {
          await playAudio(currentWord.audio_url_trigger, "trigger");
          console.log(`[Phase] Trigger audio finished`);
        }
        if (cancelled) {
          console.log(`[Phase] Cancelled after Trigger audio`);
          return;
        }
        // Play foreign audio again after trigger
        console.log(`[Phase] Replaying Foreign audio`);
        if (currentWord.audio_url_foreign) {
          await playAudio(currentWord.audio_url_foreign, "foreign");
          console.log(`[Phase] Foreign audio replay finished`);
        }
        if (cancelled) {
          console.log(`[Phase] Cancelled after Foreign audio replay`);
          return;
        }
        phaseTimeoutRef.current = setTimeout(() => {
          console.log(`[Phase] Advancing to show-input`);
          setPhase("show-input");
        }, 50);
      } else {
        console.log(`[Phase] ${phase} - no audio action`);
      }
    };

    advancePhase();

    return () => {
      console.log(`[Phase Effect] Cleanup for phase: ${phase}`);
      cancelled = true;
      stopAudio();
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
    };
  }, [phase, currentWord, playAudio, stopAudio, breathingModeEnabled]);

  // Breathing mode phase control (only when breathing mode is ON)
  // Uses a ref for cancellation to persist across effect re-runs
  const breathingCancelledRef = useRef(false);

  // Trigger breathing cycle when word changes or restart is pressed
  useEffect(() => {
    // Skip if breathing mode is disabled
    if (!breathingModeEnabled) {
      return;
    }

    // Cancel previous and start new
    breathingCancelledRef.current = true;

    // Small delay to ensure cancellation is processed
    const startTimeout = setTimeout(() => {
      breathingCancelledRef.current = false;

      const runBreathingCycle = async () => {
        const isCancelled = () => breathingCancelledRef.current;

        // INHALE phase (4 seconds) - play English + Foreign audio
        setBreathingPhase("inhale");
        setBreathingSecond(0);
        setPhase("reveal-second"); // Show foreign word immediately

        // Play English audio and wait for it
        if (currentWord.audio_url_english) {
          await playAudio(currentWord.audio_url_english, "english");
        }
        if (isCancelled()) return;

        // Play foreign audio
        if (currentWord.audio_url_foreign) {
          await playAudio(currentWord.audio_url_foreign, "foreign");
        }
        if (isCancelled()) return;

        // Count remaining seconds for inhale
        setBreathingSecond(1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;
        setBreathingSecond(2);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;
        setBreathingSecond(3);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;

        // HOLD phase (4 seconds) - play memory trigger
        setBreathingPhase("hold");
        setBreathingSecond(0);
        setPhase("show-memory-trigger");

        // Play trigger audio
        if (currentWord.audio_url_trigger) {
          await playAudio(currentWord.audio_url_trigger, "trigger");
        }
        if (isCancelled()) return;

        // Count seconds for hold
        setBreathingSecond(1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;
        setBreathingSecond(2);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;
        setBreathingSecond(3);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;

        // EXHALE phase (4 seconds) - replay foreign audio
        setBreathingPhase("exhale");
        setBreathingSecond(0);

        // Play foreign audio again
        if (currentWord.audio_url_foreign) {
          await playAudio(currentWord.audio_url_foreign, "foreign");
        }
        if (isCancelled()) return;

        // Count seconds for exhale
        setBreathingSecond(1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;
        setBreathingSecond(2);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;
        setBreathingSecond(3);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelled()) return;

        // Transition to input phase
        setBreathingPhase(null);
        setBreathingSecond(0);
        setPhase("show-input");
      };

      runBreathingCycle();
    }, 50);

    return () => {
      clearTimeout(startTimeout);
      breathingCancelledRef.current = true;
    };
  }, [currentWordIndex, breathingCycleTrigger, breathingModeEnabled, currentWord, playAudio]);

  // Handle Escape key to stop audio and skip reveal phases
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Always stop audio
        stopAudio();

        // If in a reveal phase, also skip to show-input
        if (phase === "reveal-first" || phase === "reveal-second" || phase === "show-memory-trigger") {
          if (phaseTimeoutRef.current) {
            clearTimeout(phaseTimeoutRef.current);
          }
          setPhase("show-input");
        }
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [phase, stopAudio]);

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

  // Track viewed words when navigating
  useEffect(() => {
    if (!viewedWordIndices.includes(currentWordIndex)) {
      setViewedWordIndices((prev) => [...prev, currentWordIndex]);
    }
  }, [currentWordIndex, viewedWordIndices]);

  // Handle next word
  const handleNextWord = useCallback(() => {
    if (isLastWord) {
      // Finish lesson
      handleFinishLesson();
    } else {
      // Move to next word
      setCurrentWordIndex((prev) => prev + 1);
      setPhase("reveal-first");
      // Scroll to top
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isLastWord]);

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
        // Scroll to top
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
      }
    },
    [currentWordIndex, words.length, stopAudio]
  );

  // Handle user notes change
  const handleUserNotesChange = useCallback(
    async (notes: string | null) => {
      let existingProgress: WordProgress | undefined;

      setWordProgressMap((prev) => {
        // Read existing from prev inside the updater to avoid stale closures
        existingProgress = prev.get(currentWord.id);
        const newMap = new Map(prev);
        newMap.set(currentWord.id, {
          isCorrect: existingProgress?.isCorrect || false,
          userNotes: notes,
          hasAnswered: existingProgress?.hasAnswered || false,
        });
        return newMap;
      });

      // Save notes to localStorage for session recovery
      const existing = wordProgressMap.get(currentWord.id);
      if (sessionId && existing?.hasAnswered) {
        const progressEntry: WordProgressEntry = {
          isCorrect: existing.isCorrect,
          userNotes: notes,
          answeredAt: new Date().toISOString(),
        };
        updateWordProgressStorage("study", sessionId, currentWord.id, progressEntry, currentWordIndex);
      }

      // Save notes to database immediately (for authenticated users)
      if (!isGuest) {
        const result = await saveUserNotes(currentWord.id, notes);
        if (!result.success) {
          console.error("Failed to save notes to database:", result.error);
        }
      }
    },
    [currentWord.id, currentWordIndex, sessionId, wordProgressMap, isGuest]
  );

  // Handle system notes change (admin only)
  const handleSystemNotesChange = useCallback(
    async (notes: string | null) => {
      const result = await saveSystemNotes(currentWord.id, notes);
      if (!result.success) {
        console.error("Failed to save system notes:", result.error);
      }
    },
    [currentWord.id]
  );

  // Handle finish lesson - save notes and show completion modal
  // Note: Study mode does NOT affect word mastery/streaks - only test mode does
  const handleFinishLesson = useCallback(async () => {
    // Stop any playing audio immediately
    stopAudio();
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
    }

    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!isGuest && sessionId) {
      // Only save user notes - study mode doesn't track progress/mastery
      const pendingNotes = Array.from(wordProgressMap.entries())
        .filter(([_, progress]) => progress.userNotes !== null)
        .map(([wordId, progress]) => ({
          wordId,
          userNotes: progress.userNotes,
        }));

      // Count words that were viewed/practiced for session stats
      const wordsStudied = viewedWordIndices.length;

      const result = await completeStudySession(sessionId, lesson.id, {
        wordsStudied,
        durationSeconds: elapsedSeconds,
      }, pendingNotes);

      if (result.success) {
        // Clear localStorage after successful DB sync
        clearSessionProgress("study", sessionId, lesson.id);
      } else {
        console.error("Failed to complete study session:", result.error);
      }
    }

    // Show completion modal
    setShowCompletionModal(true);
  }, [isGuest, sessionId, lesson.id, wordProgressMap, viewedWordIndices, elapsedSeconds, stopAudio]);

  // Handle modal "Start Test" action - passes initial milestone since this is right after lesson completion
  const handleStartTest = useCallback(() => {
    router.push(`/lesson/${lesson.id}/test?milestone=initial`);
  }, [router, lesson.id]);

  // Handle modal "Not now" action
  const handleDismissModal = useCallback(() => {
    router.push(`/lesson/${lesson.id}`);
  }, [router, lesson.id]);

  // Handle exit lesson - show confirmation modal
  const handleExitLesson = useCallback(() => {
    setShowExitModal(true);
  }, []);

  // Handle confirmed exit - discard progress (study mode is sandboxed)
  const handleConfirmExit = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Clear localStorage (discard progress)
    if (sessionId) {
      clearSessionProgress("study", sessionId, lesson.id);
    }
    // Navigate back to lesson page
    router.push(`/lesson/${lesson.id}`);
  }, [sessionId, lesson.id, router]);

  // Handle restart current word
  const handleRestart = useCallback(() => {
    stopAudio();
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
    }
    // Cancel any running breathing cycle
    breathingCancelledRef.current = true;
    setBreathingPhase(null);
    setBreathingSecond(0);
    setPhase("reveal-first");
    // Trigger new breathing cycle if enabled
    if (breathingModeEnabled) {
      setBreathingCycleTrigger(prev => prev + 1);
    }
  }, [stopAudio, breathingModeEnabled]);

  // Handle admin field save
  const handleFieldSave = useCallback(
    async (field: string, value: string): Promise<boolean> => {
      const result = await updateWord(currentWord.id, { [field]: value }, lesson.id);
      if (result.success) {
        // Update local word data optimistically
        // Note: The page will revalidate on next navigation
        return true;
      }
      console.error("Failed to update word field:", result.error);
      return false;
    },
    [currentWord.id, lesson.id]
  );

  // Handle admin image upload
  const handleImageUpload = useCallback(
    async (field: string, file: File): Promise<boolean> => {
      // Upload file to storage
      const uploadResult = await uploadFileClient(
        "images",
        file,
        "words",
        currentWord.id,
        field === "memory_trigger_image_url" ? "trigger" : "flashcard"
      );

      if (uploadResult.error || !uploadResult.url) {
        console.error("Failed to upload image:", uploadResult.error);
        return false;
      }

      // Update word with new image URL
      const result = await updateWord(
        currentWord.id,
        { [field]: uploadResult.url },
        lesson.id
      );

      if (result.success) {
        return true;
      }
      console.error("Failed to update word image:", result.error);
      return false;
    },
    [currentWord.id, lesson.id]
  );

  // Get current word's user notes from progress map
  const currentWordProgress = wordProgressMap.get(currentWord.id);
  const currentUserNotes = currentWordProgress?.userNotes || currentWord.progress?.user_notes || null;

  // Determine what to show based on phase
  const showForeign = phase !== "reveal-first";
  const showTrigger =
    phase === "show-memory-trigger" ||
    phase === "show-input" ||
    phase === "show-feedback";
  const showInput = true;
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
          currentWordIndex={currentWordIndex}
          totalWords={words.length}
          completedWordIndices={viewedWordIndices}
          onJumpToWord={handleJumpToWord}
          isTimerPaused={isTimerPaused}
        />

        {/* Scrollable content: WordCard full width, then two columns (pt for fixed navbar) */}
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-[160px] pt-[96px]">
          <div className="mx-auto w-full max-w-content-lg flex flex-col gap-6">
            {/* Word Card - full width */}
            <div className="w-full">
              <WordCard
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
                wordId={currentWord.id}
                isEditMode={isEditMode}
                onFieldSave={handleFieldSave}
              />
            </div>

            {/* Two columns: Memory Trigger (left), Notes/Sentences (right) */}
            <div className="flex gap-6">
              <div className="flex w-[700px] flex-col gap-6">
                {imageMode === "memory-trigger" ? (
                  <MemoryTriggerCard
                    imageUrl={currentWord.memory_trigger_image_url}
                    triggerText={currentWord.memory_trigger_text}
                    englishWord={currentWord.english}
                    foreignWord={currentWord.headword}
                    gender={currentWord.gender}
                    partOfSpeech={currentWord.part_of_speech}
                    showImage={true}
                    showTriggerText={showTrigger}
                    playingAudioType={currentAudioType}
                    onPlayTriggerAudio={() => {
                      if (currentWord.audio_url_trigger) {
                        playAudio(currentWord.audio_url_trigger, "trigger");
                      }
                    }}
                    wordId={currentWord.id}
                    isEditMode={isEditMode}
                    onFieldSave={handleFieldSave}
                    onImageUpload={handleImageUpload}
                  />
                ) : (
                  <FlashcardCard
                    imageUrl={currentWord.flashcard_image_url}
                    englishWord={currentWord.english}
                    isVisible={showTrigger}
                  />
                )}
              </div>
              <div className="flex-1">
                <StudySidebar
                  wordId={currentWord.id}
                  systemNotes={currentWord.notes}
                  userNotes={currentUserNotes}
                  exampleSentences={currentWord.exampleSentences}
                  relatedWords={currentWord.relatedWords}
                  isEnabled={sidebarEnabled}
                  onUserNotesChange={handleUserNotesChange}
                  isAdmin={isAdmin}
                  onSystemNotesChange={handleSystemNotesChange}
                  developerNotes={currentWord.developer_notes}
                  pictureWrong={currentWord.picture_wrong}
                  pictureWrongNotes={currentWord.picture_wrong_notes}
                  pictureMissing={currentWord.picture_missing}
                  pictureBadSvg={currentWord.picture_bad_svg}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom container - stacked input and action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white shadow-[0px_-8px_30px_-15px_rgba(0,0,0,0.1)]">
          {/* Answer Input Row */}
          <AnswerInput
            ref={answerInputRef}
            wordId={currentWord.id}
            languageName={language?.name || "Italian"}
            validAnswers={[currentWord.headword, ...(currentWord.alternate_answers || [])]}
            isVisible={showInput}
            isLastWord={isLastWord}
            onSubmit={handleSubmit}
            onNextWord={handleNextWord}
            strictMode={strictMode}
          />

          {/* Action Bar Row */}
          <StudyActionBar
            currentWordIndex={currentWordIndex}
            totalWords={words.length}
            englishWord={currentWord.english}
            foreignWord={currentWord.headword}
            partOfSpeech={currentWord.part_of_speech}
            wordList={words.map((w) => ({ id: w.id, english: w.english, foreign: w.headword }))}
            completedWordIndices={viewedWordIndices}
            testHistory={currentWord.testHistory}
            scoreStats={currentWord.scoreStats}
            onJumpToWord={handleJumpToWord}
            onPreviousWord={() => handleJumpToWord(currentWordIndex - 1)}
            onNextWord={() => handleJumpToWord(currentWordIndex + 1)}
            onRestart={handleRestart}
            strictMode={strictMode}
            onStrictModeChange={setStrictMode}
            languageCode={language?.code}
            onInsertCharacter={(char) => answerInputRef.current?.insertCharacter(char)}
            imageMode={imageMode}
            onImageModeChange={setImageMode}
            musicEnabled={musicEnabled}
            onMusicEnabledChange={setMusicEnabled}
            selectedTrack={selectedTrack}
            onTrackChange={setSelectedTrack}
            musicHasError={musicHasError}
            musicVolume={musicVolume}
            onMusicVolumeChange={setMusicVolume}
            isAdmin={isAdmin}
            isEditMode={isEditMode}
            onEditModeToggle={() => setIsEditMode(!isEditMode)}
            breathingModeEnabled={breathingModeEnabled}
            onBreathingModeChange={setBreathingModeEnabled}
            breathingPhase={breathingPhase}
            breathingSecond={breathingSecond}
            breathingActive={breathingModeEnabled && breathingPhase !== null}
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

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl-semibold text-foreground mb-2">Exit lesson?</h2>
            <p className="text-regular text-muted-foreground mb-6">
              Your progress will be lost. Are you sure you want to exit?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowExitModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmExit}
              >
                Exit lesson
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
