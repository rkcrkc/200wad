"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { saveSystemNotes, saveUserNotes } from "@/lib/mutations/study";
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

interface TestStats {
  totalPoints: number;
  maxPoints: number;
  scorePercent: number;
  newWordsCount: number;
  newlyLearnedCount: number;
  masteredWordsCount: number;
  courseWordsMastered: number | null;
  newlyLearnedWordIds: string[];
  masteredWordIds: string[];
  correctAnswers: number;
  durationSeconds: number;
  totalQuestions: number;
  isRetest: boolean;
}

/**
 * Pure helper that computes every stat the completion modal and
 * `completeTestSession` need. Kept outside the component so it can be called
 * BEFORE the server mutation (using a snapshot of the pre-write word progress)
 * and later re-used for the admin preview path.
 *
 * IMPORTANT: "newly learned" and "mastered" use the stricter rule
 * `mistakeCount === 0 && clueLevel === 0` to match the server's `isCorrect`
 * definition (see src/lib/mutations/test.ts — `isCorrect` gates the streak
 * increment). A clue-aided answer must NOT promote a word to mastered.
 */
function calculateTestStats(params: {
  words: WordWithDetails[];
  testProgressMap: Map<string, TestProgress>;
  testTwice: boolean;
  totalQuestions: number;
  elapsedSeconds: number;
  serverCourseWordsMastered: number | null;
  initialCourseVocabCount: number | null;
  isRetest: boolean;
}): TestStats {
  const {
    words,
    testProgressMap,
    testTwice,
    totalQuestions,
    elapsedSeconds,
    serverCourseWordsMastered,
    initialCourseVocabCount,
    isRetest,
  } = params;

  const answeredWords = Array.from(testProgressMap.values()).filter((p) => p.hasAnswered);
  const totalPoints = answeredWords.reduce((sum, p) => sum + p.pointsEarned, 0);
  const maxPoints = totalQuestions * 3;
  const scorePercent = calculateScorePercent(totalPoints, maxPoints);
  const correctAnswers = answeredWords.filter(
    (p) => p.mistakeCount === 0 && p.clueLevel === 0
  ).length;

  // New words: words answered in this test that had no prior test attempts
  const newWordsCount = words.filter((w) => {
    const wasTestedBefore = w.progress?.times_tested && w.progress.times_tested > 0;
    const progressKey = testTwice ? `${w.id}_1` : w.id;
    const answered = testProgressMap.get(progressKey)?.hasAnswered;
    return !wasTestedBefore && answered;
  }).length;

  // Newly learned: not already learned/mastered, got perfect score in this test
  // (no mistakes, no clues → matches server's isCorrect).
  const newlyLearnedWords = words.filter((w) => {
    const wasAlreadyLearned = w.status === "learned" || w.status === "mastered";
    if (wasAlreadyLearned) return false;
    const keys = testTwice ? [`${w.id}_1`, `${w.id}_2`] : [w.id];
    return keys.some((key) => {
      const p = testProgressMap.get(key);
      return p?.hasAnswered && p.mistakeCount === 0 && p.clueLevel === 0;
    });
  });
  const newlyLearnedCount = newlyLearnedWords.length;
  const newlyLearnedWordIds = newlyLearnedWords.map((w) => w.id);

  // Mastered in this test: streak reaches >= 3 using PRIOR streak from props
  // (snapshot). We only increment on a strict `isCorrect` answer.
  const masteredWordsList = words.filter((w) => {
    const priorStreak = w.progress?.correct_streak || 0;
    const wasAlreadyMastered = w.status === "mastered";
    if (wasAlreadyMastered) return false;
    let streak = priorStreak;
    const attempts = testTwice ? [`${w.id}_1`, `${w.id}_2`] : [w.id];
    for (const key of attempts) {
      const p = testProgressMap.get(key);
      if (p?.hasAnswered) {
        streak = p.mistakeCount === 0 && p.clueLevel === 0 ? streak + 1 : 0;
      }
    }
    return streak >= 3;
  });
  const masteredWordsCount = masteredWordsList.length;
  const masteredWordIds = masteredWordsList.map((w) => w.id);

  // Total vocabulary is server-authoritative; fall back to initial count.
  const courseWordsMastered: number | null =
    serverCourseWordsMastered ?? initialCourseVocabCount;

  return {
    totalPoints,
    maxPoints,
    scorePercent,
    newWordsCount,
    newlyLearnedCount,
    masteredWordsCount,
    courseWordsMastered,
    newlyLearnedWordIds,
    masteredWordIds,
    correctAnswers,
    durationSeconds: elapsedSeconds,
    totalQuestions,
    isRetest,
  };
}

interface TestModeClientProps {
  lesson: Lesson;
  language: Language | null;
  course: Course | null;
  words: WordWithDetails[];
  isGuest: boolean;
  testType?: import("@/types/test").TestType;
  testTwice?: boolean;
  /** Whether to shuffle words instead of testing in lesson order */
  randomOrder?: boolean;
  /** The intended milestone for this test (from URL), or null for self-initiated */
  milestone?: string | null;
  /** Initial course vocab count fetched server-side (pre-test). null for guests. */
  initialCourseVocabCount?: number | null;
}

export function TestModeClient({
  lesson,
  language,
  course,
  words,
  isGuest,
  testType = "english-to-foreign",
  testTwice = false,
  randomOrder = false,
  milestone = null,
  initialCourseVocabCount = null,
}: TestModeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  // If randomOrder is enabled, shuffle once on mount via Fisher-Yates.
  const [activeWords, setActiveWords] = useState(() => {
    if (!randomOrder) return words;
    const arr = [...words];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

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

  // Local user notes overrides keyed by word id (so saved notes display
  // immediately and survive navigation within the test session).
  const [userNotesOverrides, setUserNotesOverrides] = useState<Map<string, string | null>>(
    new Map()
  );

  // Local system notes overrides keyed by word id (admin only) — same
  // pattern as user notes so saved edits show immediately without refresh.
  const [systemNotesOverrides, setSystemNotesOverrides] = useState<Map<string, string | null>>(
    new Map()
  );

  // Completion modal state
  const isFinishingRef = useRef(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Admin can force-preview the completion modal via ?preview=completed
  const previewCheckedRef = useRef(false);
  useEffect(() => {
    if (!previewCheckedRef.current && isAdmin && searchParams.get("preview") === "completed") {
      previewCheckedRef.current = true;
      setShowCompletionModal(true);
    }
  }, [isAdmin, searchParams]);
  const [serverCourseWordsMastered, setServerCourseWordsMastered] = useState<number | null>(null);
  const [isRetest, setIsRetest] = useState(false);

  // Frozen snapshot of stats captured the moment `handleFinishTest` runs, BEFORE
  // any server mutation. Rendering the modal from this snapshot prevents the
  // post-write `words` prop (re-fetched during `revalidatePath`) from inflating
  // the "mastered" count on screen while the DB correctly stored pre-write
  // values. See bug fix: Test-completed modal inflates mastered count.
  const [finishedTestStats, setFinishedTestStats] = useState<TestStats | null>(null);

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
      // Prepend current attempt to full history so streak detection sees all of it
      return [currentAttempt, ...historicalHistory];
    }
    return historicalHistory;
  })();

  const mergedScoreStats = (() => {
    const historicalStats = currentWord?.scoreStats || { totalPointsEarned: 0, totalMaxPoints: 0, scorePercent: 0, timesTested: 0 };
    if (currentProgress?.hasAnswered) {
      const newTotalPoints = historicalStats.totalPointsEarned + currentProgress.pointsEarned;
      const newTotalMax = historicalStats.totalMaxPoints + currentProgress.maxPoints;
      return {
        totalPointsEarned: newTotalPoints,
        totalMaxPoints: newTotalMax,
        scorePercent: newTotalMax > 0 ? Math.round((newTotalPoints / newTotalMax) * 100) : 0,
        timesTested: historicalStats.timesTested + 1,
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
      setFinishedTestStats(null);

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

  // Warn user before leaving/refreshing the page (disabled after test completion)
  useEffect(() => {
    if (showCompletionModal) return; // No need to warn after test is done

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
  }, [showCompletionModal]);

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
    // Guard: prevent double submission
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    // Stop any playing audio immediately
    stopAudio();

    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Compute stats ONCE, BEFORE any server mutation. The `words` prop here
    // still reflects pre-write progress (correct_streak, times_tested, status).
    // After `completeTestSession` runs, `revalidatePath` can re-fetch this
    // component's server parent and swap in post-write data — so we must not
    // recompute mastery from `words` after awaiting the server call.
    const stats = calculateTestStats({
      words,
      testProgressMap,
      testTwice,
      totalQuestions,
      elapsedSeconds,
      serverCourseWordsMastered: null, // server hasn't answered yet
      initialCourseVocabCount,
      isRetest,
    });

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

      const serverStats = {
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        pointsEarned: stats.totalPoints,
        maxPoints: stats.maxPoints,
        scorePercent: stats.scorePercent,
        durationSeconds: stats.durationSeconds,
        newWordsCount: stats.newWordsCount,
        newlyLearnedCount: stats.newlyLearnedCount,
        masteredWordsCount: stats.masteredWordsCount,
        isRetest: stats.isRetest,
      };

      // Log if duration is zero (shouldn't happen if timer is working correctly)
      if (elapsedSeconds === 0) {
        console.warn("[Test Client] Completing test with 0 duration", {
          sessionId,
          lessonId: lesson.id,
          totalQuestions,
          scorePercent: stats.scorePercent,
        });
      }

      const result = await completeTestSession(sessionId, lesson.id, serverStats, questionResults, milestone);

      if (result.success) {
        clearSessionProgress("test", sessionId, lesson.id);
        setServerCourseWordsMastered(result.courseWordsMastered);
        // Merge server-authoritative total into the frozen snapshot.
        setFinishedTestStats({
          ...stats,
          courseWordsMastered: result.courseWordsMastered ?? stats.courseWordsMastered,
        });
      } else {
        console.error("Failed to complete test session:", result.error);
        setFinishedTestStats(stats);
      }
    } else {
      // Guest / no session — still freeze the stats so the modal renders
      // consistent numbers regardless of any future prop changes.
      setFinishedTestStats(stats);
    }

    setShowCompletionModal(true);
  }, [isGuest, sessionId, lesson.id, testProgressMap, words, elapsedSeconds, testTwice, totalQuestions, stopAudio, milestone, isRetest, initialCourseVocabCount]);

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

  /** Build updated word objects that fold current test results into testHistory/scoreStats */
  const buildUpdatedWords = useCallback(
    (sourceWords: WordWithDetails[]): WordWithDetails[] => {
      return sourceWords.map((w) => {
        // Gather all attempts for this word from the current session
        const attempts: { pointsEarned: number; maxPoints: number }[] = [];
        const keys = testTwice ? [`${w.id}_1`, `${w.id}_2`] : [w.id];
        for (const key of keys) {
          const p = testProgressMap.get(key);
          if (p?.hasAnswered) {
            attempts.push({ pointsEarned: p.pointsEarned, maxPoints: p.maxPoints });
          }
        }
        if (attempts.length === 0) return w;

        // Prepend new attempts (newest first) to existing history, cap at 3
        const updatedHistory = [
          ...attempts.map((a) => ({
            pointsEarned: a.pointsEarned,
            maxPoints: a.maxPoints,
            answeredAt: new Date().toISOString(),
          })),
          ...w.testHistory,
        ].slice(0, 3);

        // Recalculate score stats
        const addedPoints = attempts.reduce((s, a) => s + a.pointsEarned, 0);
        const addedMax = attempts.reduce((s, a) => s + a.maxPoints, 0);
        const prev = w.scoreStats;
        const newTotalPoints = prev.totalPointsEarned + addedPoints;
        const newTotalMax = prev.totalMaxPoints + addedMax;
        const updatedStats = {
          totalPointsEarned: newTotalPoints,
          totalMaxPoints: newTotalMax,
          scorePercent: newTotalMax > 0 ? Math.round((newTotalPoints / newTotalMax) * 100) : 0,
          timesTested: prev.timesTested + attempts.length,
        };

        return { ...w, testHistory: updatedHistory, scoreStats: updatedStats };
      });
    },
    [testProgressMap, testTwice]
  );

  const handleTestAgain = useCallback(async () => {
    // Reset finishing guard so handleFinishTest works again
    isFinishingRef.current = false;

    // Update words with current test results folded into history, then reset
    const updatedWords = buildUpdatedWords(words);
    setActiveWords(updatedWords);
    setCurrentWordIndex(0);
    setClueLevel(0);
    setTestProgressMap(new Map());
    setViewedWordIndices([0]);
    setShowCompletionModal(false);
    setElapsedSeconds(0);
    setServerCourseWordsMastered(null);
    setIsRetest(true);
    setFinishedTestStats(null);

    // Clear old session and create a new one
    if (sessionId) {
      clearSessionProgress("test", sessionId, lesson.id);
    }

    if (!isGuest) {
      const result = await createTestSession(lesson.id);
      if (result.sessionId) {
        setSessionId(result.sessionId);
        initSessionProgress("test", result.sessionId, lesson.id);
      }
    } else {
      const newSessionId = `guest_test_${lesson.id}_${Date.now()}`;
      setSessionId(newSessionId);
      initSessionProgress("test", newSessionId, lesson.id);
    }

    // Restart timer (was stopped by handleFinishTest)
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [sessionId, lesson.id, words, buildUpdatedWords, isGuest]);

  const handleRetestIncorrect = useCallback(async () => {
    // Reset finishing guard so handleFinishTest works again
    isFinishingRef.current = false;

    // Filter to only words that were not fully correct
    const incorrectWordIds = new Set<string>();
    testProgressMap.forEach((progress, key) => {
      if (progress.hasAnswered && !progress.isCorrect) {
        // In testTwice mode, key is "wordId_attemptNum", otherwise just "wordId"
        const wordId = testTwice ? key.split("_")[0] : key;
        incorrectWordIds.add(wordId);
      }
    });

    // Update words with current test results folded into history, then filter
    const updatedWords = buildUpdatedWords(words);
    const incorrectWords = updatedWords.filter((w) => incorrectWordIds.has(w.id));
    if (incorrectWords.length === 0) return;

    // Reset state with filtered words
    setActiveWords(incorrectWords);
    setCurrentWordIndex(0);
    setClueLevel(0);
    setTestProgressMap(new Map());
    setViewedWordIndices([0]);
    setShowCompletionModal(false);
    setServerCourseWordsMastered(null);
    setElapsedSeconds(0);
    setIsRetest(true);
    setFinishedTestStats(null);

    // Clear old session and create a new one
    if (sessionId) {
      clearSessionProgress("test", sessionId, lesson.id);
    }

    if (!isGuest) {
      const result = await createTestSession(lesson.id);
      if (result.sessionId) {
        setSessionId(result.sessionId);
        initSessionProgress("test", result.sessionId, lesson.id);
      }
    } else {
      const newSessionId = `guest_test_${lesson.id}_${Date.now()}`;
      setSessionId(newSessionId);
      initSessionProgress("test", newSessionId, lesson.id);
    }

    // Restart timer (was stopped by handleFinishTest)
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [testProgressMap, testTwice, words, sessionId, lesson.id, buildUpdatedWords, isGuest]);

  const handleStudyIncorrect = useCallback(() => {
    // Collect incorrect word IDs from test progress
    const incorrectWordIds = new Set<string>();
    testProgressMap.forEach((progress, key) => {
      if (progress.hasAnswered && !progress.isCorrect) {
        const wordId = testTwice ? key.split("_")[0] : key;
        incorrectWordIds.add(wordId);
      }
    });
    const wordIdsParam = [...incorrectWordIds].join(",");
    router.push(`/lesson/${lesson.id}/study?wordIds=${encodeURIComponent(wordIdsParam)}`);
  }, [lesson.id, router, testProgressMap, testTwice]);

  // Handle inserting accented character into answer input
  const handleInsertCharacter = useCallback((char: string) => {
    testAnswerInputRef.current?.insertCharacter(char);
  }, []);

  // Calculate test stats for modal.
  //
  // Prefer the frozen snapshot captured in `handleFinishTest` (pre-write). This
  // is what the user just saw answered and what the server stored. Only fall
  // back to live computation when the modal is opened without completing a
  // test (admin `?preview=completed` path).
  //
  // Note: total vocabulary is server-authoritative — `completeTestSession`
  // updates `user_word_progress` and then COUNTs `status='mastered'` across
  // ALL lessons for this user. We propagate `null` when unavailable (guest or
  // error) so the modal can render a placeholder.
  const getTestStats = (): TestStats => {
    if (finishedTestStats) return finishedTestStats;
    return calculateTestStats({
      words,
      testProgressMap,
      testTwice,
      totalQuestions,
      elapsedSeconds,
      serverCourseWordsMastered,
      initialCourseVocabCount,
      isRetest,
    });
  };

  // Build word results map for modal
  const getWordResultsMap = (): Map<string, TestWordResult> => {
    const resultsMap = new Map<string, TestWordResult>();
    testProgressMap.forEach((progress, key) => {
      if (!progress.hasAnswered) return;
      // In testTwice mode, key is "wordId_attemptNum" — normalize to bare wordId
      const actualWordId = testTwice ? key.split("_")[0] : key;
      const existing = resultsMap.get(actualWordId);
      // If we already have a result for this word (testTwice), combine:
      // use the worst grade and sum points
      if (existing) {
        const gradeOrder = { correct: 0, "half-correct": 1, incorrect: 2 } as const;
        const worstGrade = gradeOrder[progress.grade] > gradeOrder[existing.grade] ? progress.grade : existing.grade;
        resultsMap.set(actualWordId, {
          wordId: actualWordId,
          pointsEarned: existing.pointsEarned + progress.pointsEarned,
          maxPoints: existing.maxPoints + progress.maxPoints,
          isCorrect: existing.isCorrect && progress.isCorrect,
          grade: worstGrade,
        });
      } else {
        resultsMap.set(actualWordId, {
          wordId: actualWordId,
          pointsEarned: progress.pointsEarned,
          maxPoints: progress.maxPoints,
          isCorrect: progress.isCorrect,
          grade: progress.grade,
        });
      }
    });
    return resultsMap;
  };

  // Only compute when the modal is actually showing to avoid unnecessary work
  // on every render.
  const testStats = showCompletionModal ? getTestStats() : null;

  // Calculate running score for header (points earned / max possible for answered words)
  const runningScore = (() => {
    const answeredWords = Array.from(testProgressMap.values()).filter((p) => p.hasAnswered);
    const pointsEarned = answeredWords.reduce((sum, p) => sum + p.pointsEarned, 0);
    const maxPoints = answeredWords.reduce((sum, p) => sum + p.maxPoints, 0);
    return { pointsEarned, maxPoints };
  })();

  // Sidebar is always enabled in test mode (no phase restrictions).
  // Honor any local override first; the `has` check ensures explicitly cleared
  // notes (null) don't fall back to the original DB value.
  const currentUserNotes = currentWord?.id
    ? userNotesOverrides.has(currentWord.id)
      ? userNotesOverrides.get(currentWord.id) ?? null
      : currentWord?.progress?.user_notes ?? null
    : null;

  // Honor any local override first; falls back to the original DB value.
  const currentSystemNotes = currentWord?.id
    ? systemNotesOverrides.has(currentWord.id)
      ? systemNotesOverrides.get(currentWord.id) ?? null
      : currentWord?.notes ?? null
    : null;

  // Handle user notes change
  const handleUserNotesChange = useCallback(
    async (notes: string | null) => {
      if (!currentWord?.id) return;
      const wordId = currentWord.id;
      setUserNotesOverrides((prev) => {
        const next = new Map(prev);
        next.set(wordId, notes);
        return next;
      });
      if (!isGuest) {
        const result = await saveUserNotes(wordId, notes);
        if (!result.success) {
          console.error("Failed to save user notes:", result.error);
        }
      }
    },
    [currentWord?.id, isGuest]
  );

  // Handle system notes change (admin only)
  const handleSystemNotesChange = useCallback(
    async (notes: string | null) => {
      if (!currentWord) return;
      const wordId = currentWord.id;
      setSystemNotesOverrides((prev) => {
        const next = new Map(prev);
        next.set(wordId, notes);
        return next;
      });
      const result = await saveSystemNotes(wordId, notes);
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
        // Update local state so the UI reflects the change immediately
        setActiveWords((prev) =>
          prev.map((w) => (w.id === currentWord.id ? { ...w, [field]: value } : w))
        );
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
        "word-images",
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
        primaryField={testType === "foreign-to-english" ? "foreign" : "english"}
      />

      {/* Main content area */}
      <div className="ml-[240px] flex min-h-0 flex-1 flex-col">
        {/* Custom navbar */}
        <StudyNavbar
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
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-[160px] pt-[90px]">
          <div className="mx-auto w-full max-w-content-lg flex flex-col gap-4">
            {/* Word Card - full width */}
            <div className="w-full">
              <WordCard
                englishWord={currentWord?.english || ""}
                foreignWord={currentWord?.headword || ""}
                gender={currentWord?.gender}
                showEnglish={
                  testTypeConfig.showEnglishInWordCard ||
                  hasSubmittedAnswer ||
                  (testTypeConfig.pictureOnlyMode && clueLevel >= 1)
                }
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

            {currentWord?.category === "fact" ? (
              <>
                {/* Fact page: Memory Trigger (horizontal) full width, sidebar full width below */}
                {imageMode === "memory-trigger" ? (
                  <MemoryTriggerCard
                    imageUrl={currentWord?.memory_trigger_image_url}
                    triggerText={currentWord?.memory_trigger_text}
                    foreignWord={currentWord?.headword || ""}
                    gender={currentWord?.gender}
                    showImage={true}
                    showTriggerText={true}
                    playingAudioType={currentAudioType}
                    onPlayTriggerAudio={() => {
                      if (currentWord?.audio_url_trigger) {
                        playAudio(currentWord.audio_url_trigger, "trigger");
                      }
                    }}
                    pictureOnlyMode={testTypeConfig.pictureOnlyMode}
                    layout="horizontal"
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
                <StudySidebar
                  wordId={currentWord?.id || ""}
                  systemNotes={currentSystemNotes}
                  userNotes={currentUserNotes}
                  exampleSentences={currentWord?.exampleSentences}
                  relatedWords={currentWord?.relatedWords}
                  isEnabled={hasSubmittedAnswer}
                  onUserNotesChange={handleUserNotesChange}
                  isAdmin={isAdmin}
                  onSystemNotesChange={handleSystemNotesChange}
                  developerNotes={currentWord?.developer_notes}
                  pictureWrong={currentWord?.picture_wrong}
                  pictureWrongNotes={currentWord?.picture_wrong_notes}
                  pictureMissing={currentWord?.picture_missing}
                  pictureBadSvg={currentWord?.picture_bad_svg}
                  notesInMemoryTrigger={currentWord?.notes_in_memory_trigger}
                />
              </>
            ) : (
              /* Two columns: Memory Trigger (left), Notes/Sentences (right) */
              <div className="flex gap-4">
                <div className="flex w-[700px] flex-col gap-4">
                  {imageMode === "memory-trigger" ? (
                    <MemoryTriggerCard
                      imageUrl={currentWord?.memory_trigger_image_url}
                      triggerText={currentWord?.memory_trigger_text}
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
                    systemNotes={currentSystemNotes}
                    userNotes={currentUserNotes}
                    exampleSentences={currentWord?.exampleSentences}
                    relatedWords={currentWord?.relatedWords}
                    isEnabled={hasSubmittedAnswer}
                    onUserNotesChange={handleUserNotesChange}
                    isAdmin={isAdmin}
                    onSystemNotesChange={handleSystemNotesChange}
                    developerNotes={currentWord?.developer_notes}
                    pictureWrong={currentWord?.picture_wrong}
                    pictureWrongNotes={currentWord?.picture_wrong_notes}
                    pictureMissing={currentWord?.picture_missing}
                    pictureBadSvg={currentWord?.picture_bad_svg}
                    notesInMemoryTrigger={currentWord?.notes_in_memory_trigger}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom container */}
        <div className="fixed bottom-0 left-[240px] right-0 z-10 bg-white shadow-bar">
          {/* Test Answer Input */}
          <TestAnswerInput
            ref={testAnswerInputRef}
            wordId={currentWord?.id || ""}
            languageName={testTypeConfig.inputLanguageName}
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
            wordStatus={currentWord?.status}
            onJumpToWord={handleJumpToWord}
            onPreviousWord={() => handleJumpToWord(currentWordIndex - 1)}
            onNextWord={() => handleJumpToWord(currentWordIndex + 1)}
            onRestart={handleRestart}
            mode="test"
            clueLevel={clueLevel}
            onRevealClue={handleRevealClue}
            hasSubmittedAnswer={hasSubmittedAnswer}
            pictureOnlyMode={testTypeConfig.pictureOnlyMode}
            nervesOfSteelMode={nervesOfSteelMode}
            onNervesOfSteelModeChange={setNervesOfSteelMode}
            testTwice={testTwice}
            randomOrder={randomOrder}
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
      {showCompletionModal && testStats && (
        <TestCompletedModal
          lesson={lesson}
          words={activeWords}
          wordResultsMap={getWordResultsMap()}
          elapsedSeconds={elapsedSeconds}
          totalPoints={testStats.totalPoints}
          maxPoints={testStats.maxPoints}
          scorePercent={testStats.scorePercent}
          newlyLearnedCount={testStats.newlyLearnedCount}
          masteredWordsCount={testStats.masteredWordsCount}
          courseWordsMastered={testStats.courseWordsMastered}
          newlyLearnedWordIds={testStats.newlyLearnedWordIds}
          masteredWordIds={testStats.masteredWordIds}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowExitModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onMouseDown={(e) => e.preventDefault()}
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
