"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Course, Language, Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";
import { useAudio } from "@/hooks/useAudio";
import {
  StudyNavbar,
  StudyActionBar,
  WordCard,
  MemoryTriggerCard,
  StudySidebar,
  TestAnswerInput,
  TestCompletedModal,
  type TestAnswerResult,
  type TestWordResult,
} from "@/components/study";
import { useSetCourseContext } from "@/context/CourseContext";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createTestSession, completeTestSession } from "@/lib/mutations/test";
import {
  initSessionProgress,
  saveSessionProgress,
  getSessionProgress,
  clearSessionProgress,
  getIncompleteSessionId,
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
  hasAnswered: boolean;
}

interface TestModeClientProps {
  lesson: Lesson;
  language: Language | null;
  course: Course | null;
  words: WordWithDetails[];
  isGuest: boolean;
}

export function TestModeClient({
  lesson,
  language,
  course,
  words,
  isGuest,
}: TestModeClientProps) {
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
  const [clueLevel, setClueLevel] = useState<0 | 1 | 2>(0);

  // Progress tracking (keyed by word ID)
  const [testProgressMap, setTestProgressMap] = useState<Map<string, TestProgress>>(
    new Map()
  );
  const [completedWordIndices, setCompletedWordIndices] = useState<number[]>([]);

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Refs for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentWord = words[currentWordIndex];
  const isLastWord = currentWordIndex === words.length - 1;
  const currentProgress = testProgressMap.get(currentWord?.id);
  const hasSubmittedAnswer = currentProgress?.hasAnswered ?? false;

  // Build existing result for locked/answered words
  const existingResult: TestAnswerResult | null = currentProgress?.hasAnswered
    ? {
        isCorrect: currentProgress.isCorrect,
        userAnswer: currentProgress.userAnswer,
        mistakeCount: currentProgress.mistakeCount,
        pointsEarned: currentProgress.pointsEarned,
        maxPoints: currentProgress.maxPoints,
        scorePercent: calculateScorePercent(currentProgress.pointsEarned, currentProgress.maxPoints),
        grade: currentProgress.grade,
        scoreLetter: getScoreLetter(currentProgress.clueLevel, currentProgress.mistakeCount),
      }
    : null;

  // Initialize test session
  useEffect(() => {
    const initSession = async () => {
      // Check for incomplete session in localStorage
      const existingSessionId = getIncompleteSessionId("test", lesson.id);

      if (existingSessionId) {
        // Restore from localStorage
        const storedProgress = getSessionProgress("test", existingSessionId);
        if (storedProgress) {
          console.log("[Test] Restoring session from localStorage:", existingSessionId);
          setSessionId(existingSessionId);
          setCurrentWordIndex(storedProgress.currentWordIndex);

          // Restore test progress
          const restoredMap = new Map<string, TestProgress>();
          Object.entries(storedProgress.wordProgress).forEach(([wordId, entry]) => {
            // Reconstruct test progress from stored entry
            restoredMap.set(wordId, {
              clueLevel: (entry as any).clueLevel ?? 0,
              pointsEarned: (entry as any).pointsEarned ?? 0,
              maxPoints: (entry as any).maxPoints ?? 3,
              isCorrect: entry.isCorrect,
              grade: (entry as any).grade ?? "incorrect",
              mistakeCount: (entry as any).mistakeCount ?? 3,
              userAnswer: (entry as any).userAnswer ?? "",
              hasAnswered: true,
            });
          });
          setTestProgressMap(restoredMap);

          // Restore completed indices
          const completedIndices = words
            .map((w, i) => (storedProgress.wordProgress[w.id] ? i : -1))
            .filter((i) => i !== -1);
          setCompletedWordIndices(completedIndices);

          // Restore clue level for the current word
          const currentWordId = words[storedProgress.currentWordIndex]?.id;
          if (currentWordId) {
            const currentWordProgress = restoredMap.get(currentWordId);
            if (currentWordProgress) {
              setClueLevel(currentWordProgress.clueLevel);
            }
          }

          return;
        }
      }

      // Create new session
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
    };
  }, [stopAudio]);

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
      setTestProgressMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(currentWord.id, {
          clueLevel,
          pointsEarned: result.pointsEarned,
          maxPoints: result.maxPoints,
          isCorrect: result.isCorrect,
          grade: result.grade,
          mistakeCount: result.mistakeCount,
          userAnswer: result.userAnswer,
          hasAnswered: true,
        });
        return newMap;
      });
    },
    [currentWord?.id, clueLevel]
  );

  // Handle next word
  const handleNextWord = useCallback(() => {
    // Mark current word as completed
    if (!completedWordIndices.includes(currentWordIndex)) {
      setCompletedWordIndices((prev) => [...prev, currentWordIndex]);
    }

    if (isLastWord) {
      handleFinishTest();
    } else {
      setCurrentWordIndex((prev) => prev + 1);
      setClueLevel(0); // Reset clue level for new word
    }
  }, [currentWordIndex, isLastWord, completedWordIndices]);

  // Handle jump to word
  const handleJumpToWord = useCallback(
    (index: number) => {
      if (index !== currentWordIndex && index >= 0 && index < words.length) {
        stopAudio();
        setCurrentWordIndex(index);
        // Restore clue level for this word if already answered
        const progress = testProgressMap.get(words[index].id);
        setClueLevel(progress?.clueLevel ?? 0);
      }
    },
    [currentWordIndex, words, stopAudio, testProgressMap]
  );

  // Handle finish test
  const handleFinishTest = useCallback(async () => {
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!isGuest && sessionId) {
      // Prepare question results
      const questionResults = Array.from(testProgressMap.entries())
        .filter(([_, progress]) => progress.hasAnswered)
        .map(([wordId, progress]) => {
          const word = words.find((w) => w.id === wordId);
          return {
            wordId,
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
      const maxPoints = words.length * 3; // Max possible is 3 points per word
      const correctAnswers = questionResults.filter((q) => q.mistakeCount === 0).length;

      const stats = {
        totalQuestions: words.length,
        correctAnswers,
        pointsEarned: totalPoints,
        maxPoints,
        scorePercent: calculateScorePercent(totalPoints, maxPoints),
        durationSeconds: elapsedSeconds,
        newWordsCount: 0, // TODO: Calculate based on first-time words
        masteredWordsCount: 0, // TODO: Calculate based on mastery
      };

      const result = await completeTestSession(sessionId, lesson.id, stats, questionResults);

      if (result.success) {
        clearSessionProgress("test", sessionId, lesson.id);
      } else {
        console.error("Failed to complete test session:", result.error);
      }
    }

    setShowCompletionModal(true);
  }, [isGuest, sessionId, lesson.id, testProgressMap, words, elapsedSeconds]);

  // Handle exit test
  const handleExitTest = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to exit? Your progress will be saved."
    );
    if (confirmed) {
      handleFinishTest();
    }
  }, [handleFinishTest]);

  // Handle restart
  const handleRestart = useCallback(() => {
    setClueLevel(0);
  }, []);

  // Modal callbacks
  const handleDone = useCallback(() => {
    router.push(`/lesson/${lesson.id}`);
  }, [router, lesson.id]);

  const handleTestAgain = useCallback(() => {
    // Reset all state and start fresh
    setCurrentWordIndex(0);
    setClueLevel(0);
    setTestProgressMap(new Map());
    setCompletedWordIndices([]);
    setShowCompletionModal(false);
    setElapsedSeconds(0);
    
    // Create new session
    if (sessionId) {
      clearSessionProgress("test", sessionId, lesson.id);
    }
  }, [sessionId, lesson.id]);

  const handleRetestIncorrect = useCallback(() => {
    // Placeholder - redirect to lesson page with toast
    router.push(`/lesson/${lesson.id}`);
  }, [router, lesson.id]);

  const handleStudyIncorrect = useCallback(() => {
    // Placeholder - redirect to study mode
    router.push(`/lesson/${lesson.id}/study`);
  }, [router, lesson.id]);

  // Calculate test stats for modal
  const getTestStats = () => {
    const answeredWords = Array.from(testProgressMap.values()).filter((p) => p.hasAnswered);
    const totalPoints = answeredWords.reduce((sum, p) => sum + p.pointsEarned, 0);
    const maxPoints = words.length * 3;
    const scorePercent = calculateScorePercent(totalPoints, maxPoints);

    return { totalPoints, maxPoints, scorePercent };
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

  // Sidebar is always enabled in test mode (no phase restrictions)
  const currentUserNotes = currentWord?.progress?.user_notes || null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main content area - no sidebar in test mode */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Custom navbar */}
        <StudyNavbar
          languageFlag={languageFlag}
          courseName={course?.name}
          elapsedSeconds={elapsedSeconds}
          onExitLesson={handleExitTest}
          mode="test"
          lessonNumber={lesson.number}
          lessonTitle={lesson.title}
        />

        {/* Scrollable content: WordCard full width, then two columns (pt for fixed navbar) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[160px] pt-[96px]">
          <div className="mx-auto w-full max-w-content-lg flex flex-col gap-6">
            {/* Word Card - full width */}
            <div className="w-full">
              <WordCard
                partOfSpeech={currentWord?.part_of_speech}
                englishWord={currentWord?.english}
                foreignWord={currentWord?.headword}
                showForeign={hasSubmittedAnswer}
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
              />
            </div>

            {/* Two columns: Memory Trigger (left), Notes/Sentences (right) */}
            <div className="flex gap-6">
              <div className="flex w-[700px] flex-col gap-6">
                <MemoryTriggerCard
                  imageUrl={currentWord?.memory_trigger_image_url}
                  triggerText={currentWord?.memory_trigger_text}
                  englishWord={currentWord?.english}
                  foreignWord={currentWord?.headword}
                  isVisible={hasSubmittedAnswer}
                  playingAudioType={currentAudioType}
                  onPlayTriggerAudio={() => {
                    if (currentWord?.audio_url_trigger) {
                      playAudio(currentWord.audio_url_trigger, "trigger");
                    }
                  }}
                  clueLevel={hasSubmittedAnswer ? 2 : clueLevel}
                />
              </div>
              <div className="flex-1">
                <StudySidebar
                  systemNotes={currentWord?.notes}
                  userNotes={currentUserNotes}
                  exampleSentences={currentWord?.exampleSentences}
                  relatedWords={currentWord?.relatedWords}
                  isEnabled={hasSubmittedAnswer}
                  onUserNotesChange={() => {}} // Notes editing not supported in test mode
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom container */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white shadow-[0px_-8px_30px_-15px_rgba(0,0,0,0.1)]">
          {/* Test Answer Input */}
          <TestAnswerInput
            wordId={currentWord?.id || ""}
            languageName={language?.name || "Italian"}
            languageFlag={languageFlag}
            validAnswers={[currentWord?.headword || "", ...(currentWord?.alternate_answers || [])]}
            isVisible={true}
            isLastWord={isLastWord}
            clueLevel={clueLevel}
            existingResult={existingResult}
            onSubmit={handleSubmit}
            onNextWord={handleNextWord}
          />

          {/* Action Bar */}
          <StudyActionBar
            currentWordIndex={currentWordIndex}
            totalWords={words.length}
            completedWords={completedWordIndices}
            testHistory={currentWord?.testHistory}
            onJumpToWord={handleJumpToWord}
            onPreviousWord={() => handleJumpToWord(currentWordIndex - 1)}
            onNextWord={() => handleJumpToWord(currentWordIndex + 1)}
            onRestart={handleRestart}
            mode="test"
            clueLevel={clueLevel}
            onRevealClue={handleRevealClue}
          />
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <TestCompletedModal
          lesson={lesson}
          words={words}
          wordResultsMap={getWordResultsMap()}
          elapsedSeconds={elapsedSeconds}
          totalPoints={testStats.totalPoints}
          maxPoints={testStats.maxPoints}
          scorePercent={testStats.scorePercent}
          newWordsCount={0}
          masteredWordsCount={0}
          totalVocabulary={0}
          onDone={handleDone}
          onTestAgain={handleTestAgain}
          onRetestIncorrect={handleRetestIncorrect}
          onStudyIncorrect={handleStudyIncorrect}
        />
      )}
    </div>
  );
}
