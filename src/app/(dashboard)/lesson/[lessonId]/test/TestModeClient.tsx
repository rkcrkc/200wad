"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Course, Language, Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";
import { useAudio } from "@/hooks/useAudio";
import { useStudyMusic } from "@/hooks/useStudyMusic";
import {
  StudyNavbar,
  StudyActionBar,
  StudyWordListSidebar,
  WordCard,
  MemoryTriggerCard,
  FlashcardCard,
  StudySidebar,
  TestAnswerInput,
  TestCompletedModal,
  type TestAnswerResult,
  type TestWordResult,
  type TestAnswerInputHandle,
} from "@/components/study";
import { useSetCourseContext } from "@/context/CourseContext";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createTestSession, completeTestSession } from "@/lib/mutations/test";
import { saveSystemNotes } from "@/lib/mutations/study";
import { updateWord } from "@/lib/mutations/admin/words";
import { uploadFileClient } from "@/lib/supabase/storage.client";
import {
  initSessionProgress,
  saveSessionProgress,
  clearSessionProgress,
  clearAllLessonSessions,
  type WordProgressEntry,
} from "@/lib/utils/sessionStorage";
import { calculateScorePercent, getScoreLetter } from "@/lib/utils/scoring";

interface TestProgress {
  clueLevel: 0 | 1 | 2;
  pointsEarned: number;
  maxPoints: number;
  isCorrect: boolean;
  grade: "correct" | "half-correct" | "incorrect";
  mistakeCount: number;
  userAnswer: string;
  correctAnswer: string;
  hasAnswered: boolean;
}

interface TestModeClientProps {
  lesson: Lesson;
  language: Language | null;
  course: Course | null;
  words: WordWithDetails[];
  isGuest: boolean;
  testType?: import("@/types/test").TestType;
  testTwice?: boolean;
  /** The intended milestone for this test (from URL), or null for self-initiated */
  milestone?: string | null;
}

export function TestModeClient({
  lesson,
  language,
  course,
  words,
  isGuest,
  testType = "english-to-foreign",
  testTwice = false,
  milestone = null,
}: TestModeClientProps) {
  const router = useRouter();
  const { isAdmin } = useUser();
  const { playAudio, stopAudio, preloadAudio, currentAudioType, volume: wordVolume, setVolume: setWordVolume } = useAudio();
  const {
    isEnabled: musicEnabled,
    selectedTrack,
    toggleTrack,
    volume: musicVolume,
    setVolume: setMusicVolume,
    hasError: musicHasError,
    stop: stopMusic,
    tracks: musicTracks,
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

  // Active words (subset used for current test - may be filtered for retest)
  const [activeWords, setActiveWords] = useState(words);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Word navigation state
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [clueLevel, setClueLevel] = useState<0 | 1 | 2>(0);

  // Progress tracking (keyed by word ID)
  const [testProgressMap, setTestProgressMap] = useState<Map<string, TestProgress>>(
    new Map()
  );
  const [viewedWordIndices, setViewedWordIndices] = useState<number[]>([0]); // Start with first word viewed

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [serverTotalVocabulary, setServerTotalVocabulary] = useState<number | null>(null);

  // Exit confirmation modal state
  const [showExitModal, setShowExitModal] = useState(false);

  // Nerves of steel mode (punctuation counts in scoring)
  const [nervesOfSteelMode, setNervesOfSteelMode] = useState(false);

  // Image display mode (memory trigger vs flashcard)
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");

  // Admin edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  // Refs for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const testAnswerInputRef = useRef<TestAnswerInputHandle>(null);

  // Build test sequence - in testTwice mode, test all words then test them all again
  const testSequence = testTwice ? [...activeWords, ...activeWords] : activeWords;
  const totalQuestions = testSequence.length;

  // Get current word from sequence
  const currentWord = testSequence[currentWordIndex];
  const isLastWord = currentWordIndex === totalQuestions - 1;

  // For testTwice mode, we need to track progress per attempt (not just per word)
  // Attempt 1 = first pass, Attempt 2 = second pass
  const currentAttemptNumber = testTwice && currentWordIndex >= activeWords.length ? 2 : 1;
  const progressKey = testTwice ? `${currentWord?.id}_${currentAttemptNumber}` : currentWord?.id;
  const currentProgress = testProgressMap.get(progressKey || "");
  const hasSubmittedAnswer = currentProgress?.hasAnswered ?? false;

  // Build existing result for locked/answered words
  const existingResult: TestAnswerResult | null = currentProgress?.hasAnswered
    ? {
        isCorrect: currentProgress.isCorrect,
        userAnswer: currentProgress.userAnswer,
        correctAnswer: currentProgress.correctAnswer,
        mistakeCount: currentProgress.mistakeCount,
        pointsEarned: currentProgress.pointsEarned,
        maxPoints: currentProgress.maxPoints,
        scorePercent: calculateScorePercent(currentProgress.pointsEarned, currentProgress.maxPoints),
        grade: currentProgress.grade,
        scoreLetter: getScoreLetter(currentProgress.clueLevel, currentProgress.mistakeCount),
      }
    : null;

  // Compute merged traffic lights and score stats including current session's answer
  const mergedTestHistory = (() => {
    const historicalHistory = currentWord?.testHistory || [];
    if (currentProgress?.hasAnswered) {
      // Prepend current session's result as most recent
      const currentAttempt = {
        pointsEarned: currentProgress.pointsEarned,
        maxPoints: currentProgress.maxPoints,
        answeredAt: new Date().toISOString(),
      };
      // Take first 2 from history + current = 3 total for traffic lights
      return [currentAttempt, ...historicalHistory.slice(0, 2)];
    }
    return historicalHistory;
  })();

  const mergedScoreStats = (() => {
    const historicalStats = currentWord?.scoreStats || { totalPointsEarned: 0, totalMaxPoints: 0, scorePercent: 0 };
    if (currentProgress?.hasAnswered) {
      const newTotalPoints = historicalStats.totalPointsEarned + currentProgress.pointsEarned;
      const newTotalMax = historicalStats.totalMaxPoints + currentProgress.maxPoints;
      return {
        totalPointsEarned: newTotalPoints,
        totalMaxPoints: newTotalMax,
        scorePercent: newTotalMax > 0 ? Math.round((newTotalPoints / newTotalMax) * 100) : 0,
      };
    }
    return historicalStats;
  })();

  // Initialize test session (always fresh - tests are sandboxed)
  useEffect(() => {
    const initSession = async () => {
      // Reset all component state to ensure fresh start
      setCurrentWordIndex(0);
      setClueLevel(0);
      setTestProgressMap(new Map());
      setViewedWordIndices([0]);
      setShowCompletionModal(false);
      setElapsedSeconds(0);
      setNervesOfSteelMode(false);

      // Aggressively clear ALL previous test sessions for this lesson
      clearAllLessonSessions("test", lesson.id);

      // Create new session - always start fresh
      let newSessionId: string;

      if (!isGuest) {
        const result = await createTestSession(lesson.id);
        if (result.sessionId) {
          newSessionId = result.sessionId;
          console.log("[Test] Created DB session:", newSessionId);
        } else {
          newSessionId = `local_test_${lesson.id}_${Date.now()}`;
          console.log("[Test] DB session failed, using local:", newSessionId, result.error);
        }
      } else {
        newSessionId = `guest_test_${lesson.id}_${Date.now()}`;
        console.log("[Test] Guest session:", newSessionId);
      }

      setSessionId(newSessionId);
      initSessionProgress("test", newSessionId, lesson.id);
    };

    initSession();
  }, [lesson.id, isGuest]);

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

  // Preload all English audio on mount for instant playback
  useEffect(() => {
    const englishUrls = words.map((w) => w.audio_url_english).filter(Boolean);
    preloadAudio(englishUrls);
  }, [words, preloadAudio]);

  // Preload audio for current word (and next word for smoother transitions)
  useEffect(() => {
    if (!currentWord) return;

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      stopMusic();
    };
  }, [stopAudio, stopMusic]);

  // Auto-play audio when word changes (based on test type)
  useEffect(() => {
    if (testType === "english-to-foreign") {
      // Play English audio (user needs to type foreign)
      if (currentWord?.audio_url_english) {
        playAudio(currentWord.audio_url_english, "english");
      }
    } else if (testType === "foreign-to-english") {
      // Play foreign audio (user needs to type English)
      if (currentWord?.audio_url_foreign) {
        playAudio(currentWord.audio_url_foreign, "foreign");
      }
    }
    // For picture-only, no auto-play on load
  }, [currentWordIndex, testType, currentWord?.audio_url_english, currentWord?.audio_url_foreign, playAudio]);

  // Auto-play trigger audio when trigger text clue is revealed (clueLevel 2)
  useEffect(() => {
    if (clueLevel === 2 && currentWord?.audio_url_trigger) {
      playAudio(currentWord.audio_url_trigger, "trigger");
    }
  }, [clueLevel, currentWord?.audio_url_trigger, playAudio]);

  // Handle Escape key to stop audio
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopAudio();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [stopAudio]);

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

  // Intercept browser back/forward navigation (e.g. Option+Arrow, Cmd+[, back button)
  useEffect(() => {
    // Push a dummy state so pressing back triggers popstate instead of leaving
    window.history.pushState({ testMode: true }, '');

    const handlePopState = () => {
      // Re-push state to prevent actual navigation
      window.history.pushState({ testMode: true }, '');
      setShowExitModal(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Save progress to localStorage whenever word index or progress changes
  useEffect(() => {
    if (!sessionId) return;

    const wordProgressRecord: Record<string, WordProgressEntry & { clueLevel?: number; pointsEarned?: number; maxPoints?: number; grade?: string; mistakeCount?: number; userAnswer?: string }> = {};
    testProgressMap.forEach((progress, wordId) => {
      if (progress.hasAnswered) {
        wordProgressRecord[wordId] = {
          isCorrect: progress.isCorrect,
          userNotes: null,
          answeredAt: new Date().toISOString(),
          clueLevel: progress.clueLevel,
          pointsEarned: progress.pointsEarned,
          maxPoints: progress.maxPoints,
          grade: progress.grade,
          mistakeCount: progress.mistakeCount,
          userAnswer: progress.userAnswer,
        };
      }
    });

    saveSessionProgress("test", sessionId, lesson.id, currentWordIndex, wordProgressRecord);
  }, [sessionId, lesson.id, currentWordIndex, testProgressMap]);

  // Handle revealing a clue
  const handleRevealClue = useCallback(() => {
    if (clueLevel < 2) {
      setClueLevel((prev) => (prev + 1) as 0 | 1 | 2);
    }
  }, [clueLevel]);

  // Handle answer submission
  const handleSubmit = useCallback(
    (result: TestAnswerResult) => {
      if (!progressKey) return;
      setTestProgressMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(progressKey, {
          clueLevel,
          pointsEarned: result.pointsEarned,
          maxPoints: result.maxPoints,
          isCorrect: result.isCorrect,
          grade: result.grade,
          mistakeCount: result.mistakeCount,
          userAnswer: result.userAnswer,
          correctAnswer: result.correctAnswer,
          hasAnswered: true,
        });
        return newMap;
      });

      // Play foreign word audio after answer is marked
      if (currentWord.audio_url_foreign) {
        playAudio(currentWord.audio_url_foreign, "foreign");
      }
    },
    [progressKey, currentWord?.audio_url_foreign, clueLevel, playAudio]
  );

  // Handle finish test (defined before handleNextWord to avoid stale reference)
  const handleFinishTest = useCallback(async () => {
    // Stop any playing audio immediately
    stopAudio();

    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!isGuest && sessionId) {
      // Prepare question results
      const questionResults = Array.from(testProgressMap.entries())
        .filter(([_, progress]) => progress.hasAnswered)
        .map(([progressKey, progress]) => {
          // In testTwice mode, progressKey is "wordId_attemptNum", otherwise just "wordId"
          const actualWordId = testTwice ? progressKey.split("_")[0] : progressKey;
          const word = words.find((w) => w.id === actualWordId);
          return {
            wordId: actualWordId,
            userAnswer: progress.userAnswer,
            correctAnswer: word?.headword || "",
            clueLevel: progress.clueLevel,
            mistakeCount: progress.mistakeCount,
            pointsEarned: progress.pointsEarned,
            maxPoints: progress.maxPoints,
          };
        });

      // Calculate stats
      const totalPoints = questionResults.reduce((sum, q) => sum + q.pointsEarned, 0);
      const maxPoints = totalQuestions * 3; // Max possible is 3 points per word
      const correctAnswers = questionResults.filter((q) => q.mistakeCount === 0).length;

      // Calculate new words: words that had no prior test attempts
      const newWordsCount = words.filter((w) => {
        const wasTestedBefore = w.progress?.times_tested && w.progress.times_tested > 0;
        // Check if this word was answered in this test
        const progressKey = testTwice ? `${w.id}_1` : w.id;
        const answered = testProgressMap.get(progressKey)?.hasAnswered;
        return !wasTestedBefore && answered;
      }).length;

      // Calculate mastered words: words that reach streak >= 3 during this test
      const masteredWordsCount = words.filter((w) => {
        const priorStreak = w.progress?.correct_streak || 0;
        const wasAlreadyMastered = w.status === "mastered";
        if (wasAlreadyMastered) return false;
        // Count consecutive correct answers in this test for this word
        let streak = priorStreak;
        const attempts = testTwice ? [`${w.id}_1`, `${w.id}_2`] : [w.id];
        for (const key of attempts) {
          const p = testProgressMap.get(key);
          if (p?.hasAnswered) {
            streak = p.mistakeCount === 0 ? streak + 1 : 0;
          }
        }
        return streak >= 3;
      }).length;

      const stats = {
        totalQuestions,
        correctAnswers,
        pointsEarned: totalPoints,
        maxPoints,
        scorePercent: calculateScorePercent(totalPoints, maxPoints),
        durationSeconds: elapsedSeconds,
        newWordsCount,
        masteredWordsCount,
      };

      const result = await completeTestSession(sessionId, lesson.id, stats, questionResults, milestone);

      if (result.success) {
        clearSessionProgress("test", sessionId, lesson.id);
        setServerTotalVocabulary(result.totalVocabulary);
      } else {
        console.error("Failed to complete test session:", result.error);
      }
    }

    setShowCompletionModal(true);
  }, [isGuest, sessionId, lesson.id, testProgressMap, words, elapsedSeconds, testTwice, totalQuestions, stopAudio, milestone]);

  // Track viewed words when navigating
  useEffect(() => {
    if (!viewedWordIndices.includes(currentWordIndex)) {
      setViewedWordIndices((prev) => [...prev, currentWordIndex]);
    }
  }, [currentWordIndex, viewedWordIndices]);

  // Handle next word
  const handleNextWord = useCallback(() => {
    if (isLastWord) {
      handleFinishTest();
    } else {
      setCurrentWordIndex((prev) => prev + 1);
      setClueLevel(0); // Reset clue level for new word
      // Scroll to top
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isLastWord, handleFinishTest]);

  // Handle jump to word
  const handleJumpToWord = useCallback(
    (index: number) => {
      if (index !== currentWordIndex && index >= 0 && index < totalQuestions) {
        stopAudio();
        setCurrentWordIndex(index);
        // Restore clue level for this word if already answered
        const word = testSequence[index];
        const attemptNum = testTwice && index >= activeWords.length ? 2 : 1;
        const key = testTwice ? `${word.id}_${attemptNum}` : word.id;
        const progress = testProgressMap.get(key);
        setClueLevel(progress?.clueLevel ?? 0);
        // Scroll to top
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
      }
    },
    [currentWordIndex, totalQuestions, testSequence, testTwice, activeWords.length, stopAudio, testProgressMap]
  );

  // Handle exit test - show confirmation modal
  const handleExitTest = useCallback(() => {
    setShowExitModal(true);
  }, []);

  // Handle confirmed exit - discard progress (tests are sandboxed)
  const handleConfirmExit = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Clear localStorage (discard progress)
    if (sessionId) {
      clearSessionProgress("test", sessionId, lesson.id);
    }
    // Navigate back to lesson page
    router.push(`/lesson/${lesson.id}`);
  }, [sessionId, lesson.id, router]);

  // Handle restart/replay - replay all word audio (english, foreign, trigger)
  const handleRestart = useCallback(async () => {
    if (currentWord?.audio_url_english) {
      await playAudio(currentWord.audio_url_english, "english");
    }
    if (currentWord?.audio_url_foreign) {
      await playAudio(currentWord.audio_url_foreign, "foreign");
    }
    if (currentWord?.audio_url_trigger) {
      await playAudio(currentWord.audio_url_trigger, "trigger");
    }
  }, [currentWord?.audio_url_english, currentWord?.audio_url_foreign, currentWord?.audio_url_trigger, playAudio]);

  // Modal callbacks
  const handleDone = useCallback(() => {
    // Redirect to schedule with completed=test for alternating logic
    if (course?.id) {
      router.push(`/course/${course.id}/schedule?completed=test`);
    } else {
      router.push(`/lesson/${lesson.id}`);
    }
  }, [router, lesson.id, course?.id]);

  const handleTestAgain = useCallback(() => {
    // Reset all state and start fresh with all words
    setActiveWords(words);
    setCurrentWordIndex(0);
    setClueLevel(0);
    setTestProgressMap(new Map());
    setViewedWordIndices([0]);
    setShowCompletionModal(false);
    setElapsedSeconds(0);
    setServerTotalVocabulary(null);

    // Create new session
    if (sessionId) {
      clearSessionProgress("test", sessionId, lesson.id);
    }
  }, [sessionId, lesson.id, words]);

  const handleRetestIncorrect = useCallback(() => {
    // Filter to only words that were not fully correct
    const incorrectWordIds = new Set<string>();
    testProgressMap.forEach((progress, key) => {
      if (progress.hasAnswered && !progress.isCorrect) {
        // In testTwice mode, key is "wordId_attemptNum", otherwise just "wordId"
        const wordId = testTwice ? key.split("_")[0] : key;
        incorrectWordIds.add(wordId);
      }
    });

    const incorrectWords = words.filter((w) => incorrectWordIds.has(w.id));
    if (incorrectWords.length === 0) return;

    // Reset state with filtered words
    setActiveWords(incorrectWords);
    setCurrentWordIndex(0);
    setClueLevel(0);
    setTestProgressMap(new Map());
    setViewedWordIndices([0]);
    setShowCompletionModal(false);
    setServerTotalVocabulary(null);
    setElapsedSeconds(0);

    if (sessionId) {
      clearSessionProgress("test", sessionId, lesson.id);
    }
  }, [testProgressMap, testTwice, words, sessionId, lesson.id]);

  const handleStudyIncorrect = useCallback(() => {
    // Placeholder - redirect to study mode
    router.push(`/lesson/${lesson.id}/study`);
  }, [router, lesson.id]);

  // Handle inserting accented character into answer input
  const handleInsertCharacter = useCallback((char: string) => {
    testAnswerInputRef.current?.insertCharacter(char);
  }, []);

  // Calculate test stats for modal
  const getTestStats = () => {
    const answeredWords = Array.from(testProgressMap.values()).filter((p) => p.hasAnswered);
    const totalPoints = answeredWords.reduce((sum, p) => sum + p.pointsEarned, 0);
    const maxPoints = totalQuestions * 3;
    const scorePercent = calculateScorePercent(totalPoints, maxPoints);

    // New words: words answered in this test that had no prior test attempts
    const newWordsCount = words.filter((w) => {
      const wasTestedBefore = w.progress?.times_tested && w.progress.times_tested > 0;
      const progressKey = testTwice ? `${w.id}_1` : w.id;
      const answered = testProgressMap.get(progressKey)?.hasAnswered;
      return !wasTestedBefore && answered;
    }).length;

    // Mastered this test: words that reach streak >= 3 during this test (weren't already mastered)
    const masteredWordsCount = words.filter((w) => {
      const priorStreak = w.progress?.correct_streak || 0;
      const wasAlreadyMastered = w.status === "mastered";
      if (wasAlreadyMastered) return false;
      let streak = priorStreak;
      const attempts = testTwice ? [`${w.id}_1`, `${w.id}_2`] : [w.id];
      for (const key of attempts) {
        const p = testProgressMap.get(key);
        if (p?.hasAnswered) {
          streak = p.mistakeCount === 0 ? streak + 1 : 0;
        }
      }
      return streak >= 3;
    }).length;

    // Total vocabulary: use server count (includes all mastered words across all lessons)
    // Fallback to local calculation if server hasn't responded yet
    const totalVocabulary = serverTotalVocabulary ?? (
      words.filter((w) => w.status === "mastered").length + masteredWordsCount
    );

    return { totalPoints, maxPoints, scorePercent, newWordsCount, masteredWordsCount, totalVocabulary };
  };

  // Build word results map for modal
  const getWordResultsMap = (): Map<string, TestWordResult> => {
    const resultsMap = new Map<string, TestWordResult>();
    testProgressMap.forEach((progress, wordId) => {
      if (progress.hasAnswered) {
        resultsMap.set(wordId, {
          wordId,
          pointsEarned: progress.pointsEarned,
          maxPoints: progress.maxPoints,
          isCorrect: progress.isCorrect,
          grade: progress.grade,
        });
      }
    });
    return resultsMap;
  };

  const testStats = getTestStats();

  // Calculate running score for header (points earned / max possible for answered words)
  const runningScore = (() => {
    const answeredWords = Array.from(testProgressMap.values()).filter((p) => p.hasAnswered);
    const pointsEarned = answeredWords.reduce((sum, p) => sum + p.pointsEarned, 0);
    const maxPoints = answeredWords.reduce((sum, p) => sum + p.maxPoints, 0);
    return { pointsEarned, maxPoints };
  })();

  // Sidebar is always enabled in test mode (no phase restrictions)
  const currentUserNotes = currentWord?.progress?.user_notes || null;

  // Handle system notes change (admin only)
  const handleSystemNotesChange = useCallback(
    async (notes: string | null) => {
      if (!currentWord) return;
      const result = await saveSystemNotes(currentWord.id, notes);
      if (!result.success) {
        console.error("Failed to save system notes:", result.error);
      }
    },
    [currentWord]
  );

  // Handle admin field save
  const handleFieldSave = useCallback(
    async (field: string, value: string): Promise<boolean> => {
      if (!currentWord) return false;
      const result = await updateWord(currentWord.id, { [field]: value }, lesson.id);
      if (result.success) {
        // Update local state so the UI reflects the change immediately
        setActiveWords((prev) =>
          prev.map((w) => (w.id === currentWord.id ? { ...w, [field]: value } : w))
        );
        return true;
      }
      console.error("Failed to update word field:", result.error);
      return false;
    },
    [currentWord, lesson.id]
  );

  // Handle admin array field save (alternate answers)
  const handleArrayFieldSave = useCallback(
    async (field: string, value: string[]): Promise<boolean> => {
      if (!currentWord) return false;
      const result = await updateWord(currentWord.id, { [field]: value }, lesson.id);
      if (result.success) {
        return true;
      }
      console.error("Failed to update word array field:", result.error);
      return false;
    },
    [currentWord, lesson.id]
  );

  // Handle admin image upload
  const handleImageUpload = useCallback(
    async (field: string, file: File): Promise<boolean> => {
      if (!currentWord) return false;
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
    [currentWord, lesson.id]
  );

  // Build testResults map for word tracker dots (sequence index -> grade)
  const testResults = new Map<number, "correct" | "half-correct" | "incorrect">();
  testSequence.forEach((word, index) => {
    const attemptNum = testTwice && index >= activeWords.length ? 2 : 1;
    const key = testTwice ? `${word.id}_${attemptNum}` : word.id;
    const progress = testProgressMap.get(key);
    if (progress?.hasAnswered) {
      testResults.set(index, progress.grade);
    }
  });

  // Test-type-specific computed values
  const testTypeConfig = (() => {
    switch (testType) {
      case "foreign-to-english":
        return {
          // WordCard: Show foreign, hide English until answered
          showEnglishInWordCard: false,
          showForeignInWordCard: true,
          // Answer input
          validAnswers: [currentWord?.english || "", ...(currentWord?.alternate_english_answers || [])],
          inputLanguageName: "English",
          inputPlaceholder: "Type the word in English...",
          showAccentsPanel: false,
          // Memory trigger clues work the same
          // For picture-only mode in MemoryTriggerCard
          pictureOnlyMode: false,
        };
      case "picture-only":
        return {
          // WordCard: Hide both words (picture is shown in MemoryTriggerCard)
          showEnglishInWordCard: false,
          showForeignInWordCard: false,
          // Answer input
          validAnswers: [currentWord?.headword || "", ...(currentWord?.alternate_answers || [])],
          inputLanguageName: language?.name || "Foreign",
          inputPlaceholder: `Type the word in ${language?.name || "the language"}...`,
          showAccentsPanel: true,
          // Picture is the question, clues reveal English word then text
          pictureOnlyMode: true,
        };
      case "english-to-foreign":
      default:
        return {
          // WordCard: Show English, hide foreign until answered (current behavior)
          showEnglishInWordCard: true,
          showForeignInWordCard: false,
          // Answer input
          validAnswers: [currentWord?.headword || "", ...(currentWord?.alternate_answers || [])],
          inputLanguageName: language?.name || "Foreign",
          inputPlaceholder: `Type the word in ${language?.name || "the language"}...`,
          showAccentsPanel: true,
          pictureOnlyMode: false,
        };
    }
  })();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Word list sidebar */}
      <StudyWordListSidebar
        wordList={testSequence.map((w) => ({ id: w.id, english: w.english, foreign: w.headword }))}
        currentWordIndex={currentWordIndex}
        completedWordIndices={viewedWordIndices}
        onJumpToWord={handleJumpToWord}
        mode="test"
        testResults={testResults}
      />

      {/* Main content area */}
      <div className="ml-[240px] flex min-h-0 flex-1 flex-col">
        {/* Custom navbar */}
        <StudyNavbar
          languageFlag={languageFlag}
          courseName={course?.name}
          elapsedSeconds={elapsedSeconds}
          onExitLesson={handleExitTest}
          mode="test"
          lessonNumber={lesson.number}
          lessonTitle={lesson.title}
          currentWordIndex={currentWordIndex}
          totalWords={totalQuestions}
          completedWordIndices={viewedWordIndices}
          onJumpToWord={handleJumpToWord}
          testResults={testResults}
          testPointsEarned={runningScore.pointsEarned}
          testMaxPoints={runningScore.maxPoints}
        />

        {/* Scrollable content: WordCard full width, then two columns (pt for fixed navbar) */}
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-[160px] pt-[96px]">
          <div className="mx-auto w-full max-w-content-lg flex flex-col gap-6">
            {/* Word Card - full width (hidden in picture-only mode) */}
            {testType !== "picture-only" && (
              <div className="w-full">
                <WordCard
                  englishWord={currentWord?.english || ""}
                  foreignWord={currentWord?.headword || ""}
                  gender={currentWord?.gender}
                  showEnglish={testTypeConfig.showEnglishInWordCard || hasSubmittedAnswer}
                  showForeign={testTypeConfig.showForeignInWordCard || hasSubmittedAnswer}
                  playingAudioType={currentAudioType}
                  onPlayEnglishAudio={() => {
                    if (currentWord?.audio_url_english) {
                      playAudio(currentWord.audio_url_english, "english");
                    }
                  }}
                  onPlayForeignAudio={() => {
                    if (currentWord?.audio_url_foreign) {
                      playAudio(currentWord.audio_url_foreign, "foreign");
                    }
                  }}
                  mode="test"
                  hasSubmitted={hasSubmittedAnswer}
                  wordId={currentWord?.id}
                  isEditMode={isEditMode}
                  onFieldSave={handleFieldSave}
                  onArrayFieldSave={handleArrayFieldSave}
                  alternateAnswers={currentWord?.alternate_answers || []}
                  alternateEnglishAnswers={currentWord?.alternate_english_answers || []}
                />
              </div>
            )}

            {/* Two columns: Memory Trigger (left), Notes/Sentences (right) */}
            <div className="flex gap-6">
              <div className="flex w-[700px] flex-col gap-6">
                {imageMode === "memory-trigger" ? (
                  <MemoryTriggerCard
                    imageUrl={currentWord?.memory_trigger_image_url}
                    triggerText={currentWord?.memory_trigger_text}
                    englishWord={currentWord?.english || ""}
                    foreignWord={currentWord?.headword || ""}
                    gender={currentWord?.gender}
                    isVisible={hasSubmittedAnswer}
                    playingAudioType={currentAudioType}
                    onPlayTriggerAudio={() => {
                      if (currentWord?.audio_url_trigger) {
                        playAudio(currentWord.audio_url_trigger, "trigger");
                      }
                    }}
                    clueLevel={hasSubmittedAnswer ? 2 : clueLevel}
                    pictureOnlyMode={testTypeConfig.pictureOnlyMode}
                    wordId={currentWord?.id}
                    isEditMode={isEditMode}
                    onFieldSave={handleFieldSave}
                    onImageUpload={handleImageUpload}
                  />
                ) : (
                  <FlashcardCard
                    imageUrl={currentWord?.flashcard_image_url || null}
                    englishWord={currentWord?.english || ""}
                    isVisible={hasSubmittedAnswer}
                    clueLevel={hasSubmittedAnswer ? 2 : clueLevel}
                  />
                )}
              </div>
              <div className="flex-1">
                <StudySidebar
                  wordId={currentWord?.id || ""}
                  systemNotes={currentWord?.notes}
                  userNotes={currentUserNotes}
                  exampleSentences={currentWord?.exampleSentences}
                  relatedWords={currentWord?.relatedWords}
                  isEnabled={hasSubmittedAnswer}
                  onUserNotesChange={() => {}} // User notes editing not supported in test mode
                  isAdmin={isAdmin}
                  onSystemNotesChange={handleSystemNotesChange}
                  developerNotes={currentWord?.developer_notes}
                  pictureWrong={currentWord?.picture_wrong}
                  pictureWrongNotes={currentWord?.picture_wrong_notes}
                  pictureMissing={currentWord?.picture_missing}
                  pictureBadSvg={currentWord?.picture_bad_svg}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom container */}
        <div className="fixed bottom-0 left-[240px] right-0 z-10 bg-white shadow-bar">
          {/* Test Answer Input */}
          <TestAnswerInput
            ref={testAnswerInputRef}
            wordId={currentWord?.id || ""}
            languageName={testTypeConfig.inputLanguageName}
            languageFlag={testType === "foreign-to-english" ? "🇬🇧" : languageFlag}
            languageCode={testType === "foreign-to-english" ? "en" : language?.code}
            validAnswers={testTypeConfig.validAnswers}
            isVisible={true}
            isLastWord={isLastWord}
            clueLevel={clueLevel}
            existingResult={existingResult}
            onSubmit={handleSubmit}
            onNextWord={handleNextWord}
            nervesOfSteelMode={nervesOfSteelMode}
          />

          {/* Action Bar */}
          <StudyActionBar
            currentWordIndex={currentWordIndex}
            totalWords={totalQuestions}
            englishWord={currentWord?.english || ""}
            foreignWord={currentWord?.headword || ""}
            partOfSpeech={currentWord?.part_of_speech}
            gender={currentWord?.gender}
            category={currentWord?.category}
            wordList={testSequence.map((w) => ({ id: w.id, english: w.english, foreign: w.headword }))}
            completedWordIndices={viewedWordIndices}
            testHistory={mergedTestHistory}
            scoreStats={mergedScoreStats}
            onJumpToWord={handleJumpToWord}
            onPreviousWord={() => handleJumpToWord(currentWordIndex - 1)}
            onNextWord={() => handleJumpToWord(currentWordIndex + 1)}
            onRestart={handleRestart}
            mode="test"
            clueLevel={clueLevel}
            onRevealClue={handleRevealClue}
            hasSubmittedAnswer={hasSubmittedAnswer}
            nervesOfSteelMode={nervesOfSteelMode}
            onNervesOfSteelModeChange={setNervesOfSteelMode}
            testTwice={testTwice}
            languageCode={testTypeConfig.showAccentsPanel ? language?.code : undefined}
            onInsertCharacter={testTypeConfig.showAccentsPanel ? handleInsertCharacter : undefined}
            imageMode={imageMode}
            onImageModeChange={setImageMode}
            musicEnabled={musicEnabled}
            musicTracks={musicTracks}
            selectedTrack={selectedTrack}
            onToggleTrack={toggleTrack}
            musicHasError={musicHasError}
            musicVolume={musicVolume}
            onMusicVolumeChange={setMusicVolume}
            wordVolume={wordVolume}
            onWordVolumeChange={setWordVolume}
            isAdmin={isAdmin}
            isEditMode={isEditMode}
            onEditModeToggle={() => setIsEditMode(!isEditMode)}
          />
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <TestCompletedModal
          lesson={lesson}
          words={activeWords}
          wordResultsMap={getWordResultsMap()}
          elapsedSeconds={elapsedSeconds}
          totalPoints={testStats.totalPoints}
          maxPoints={testStats.maxPoints}
          scorePercent={testStats.scorePercent}
          newWordsCount={testStats.newWordsCount}
          masteredWordsCount={testStats.masteredWordsCount}
          totalVocabulary={testStats.totalVocabulary}
          onDone={handleDone}
          onTestAgain={handleTestAgain}
          onRetestIncorrect={handleRetestIncorrect}
          onStudyIncorrect={handleStudyIncorrect}
        />
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl-semibold text-foreground mb-2">Exit test?</h2>
            <p className="text-regular text-muted-foreground mb-6">
              Your test scores will be lost. Are you sure you want to exit?
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
                Exit test
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
