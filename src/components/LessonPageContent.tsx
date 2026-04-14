"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { WordsList } from "@/components/WordsList";
import { LessonActivityHistory } from "@/components/LessonActivityHistory";
import { Button } from "@/components/ui/button";
import { StartTestModal } from "@/components/study";
import { formatDuration, formatNumber, formatPercent } from "@/lib/utils/helpers";
import { WordWithDetails } from "@/lib/queries/words";
import { LessonActivityHistoryResult } from "@/lib/queries";
import { Lesson } from "@/types/database";
import { TestType } from "@/types/test";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Popover } from "@/components/ui/popover";
import { status as statusTokens } from "@/lib/design-tokens";
import { useText } from "@/context/TextContext";

interface AdjacentLesson {
  id: string;
  number: number;
  title: string;
}

interface LessonPageContentProps {
  lesson: Lesson;
  words: WordWithDetails[];
  languageFlag?: string;
  languageName?: string;
  courseId?: string;
  wordsNotStarted: number;
  wordsLearning: number;
  wordsMastered: number;
  masteredPercentage: number;
  averageTestScore: number | null;
  totalTimeSeconds: number;
  studyTimeSeconds: number;
  testTimeSeconds: number;
  previousLesson: AdjacentLesson | null;
  nextLesson: AdjacentLesson | null;
  activityHistory?: LessonActivityHistoryResult;
}

export function LessonPageContent({
  lesson,
  words,
  languageFlag,
  languageName,
  courseId,
  wordsNotStarted,
  wordsLearning,
  wordsMastered,
  masteredPercentage,
  averageTestScore,
  totalTimeSeconds,
  studyTimeSeconds,
  testTimeSeconds,
  previousLesson,
  nextLesson,
  activityHistory,
}: LessonPageContentProps) {
  const { t } = useText();
  const router = useRouter();
  const [, setIsWordSelected] = useState(false);
  const [showStartTestModal, setShowStartTestModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Count words with memory trigger images (for picture-only mode)
  const wordsWithImages = words.filter((w) => w.memory_trigger_image_url).length;

  const handleStartTest = (testType: TestType, testTwice: boolean) => {
    setShowStartTestModal(false);
    const params = new URLSearchParams({ type: testType });
    if (testTwice) params.set("twice", "true");
    router.push(`/lesson/${lesson.id}/test?${params.toString()}`);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-regular-semibold text-black-80">
              Lesson #{lesson.number}
            </p>
            <h1 className="flex items-center gap-4 text-xxl-semibold">
              {lesson.emoji && <span className="text-2xl">{lesson.emoji}</span>}
              {lesson.title}
            </h1>
          </div>

          {/* Stats */}
          <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
            {/* Status */}
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Status</span>
              <span
                className="text-small-semibold"
                style={{
                  color: masteredPercentage === 100
                    ? statusTokens.mastered.color
                    : wordsNotStarted === words.length
                      ? statusTokens.notStarted.color
                      : statusTokens.learning.color,
                }}
              >
                {masteredPercentage === 100
                  ? "Mastered"
                  : wordsNotStarted === words.length
                    ? "Not started"
                    : "Learning"}
              </span>
            </div>

            {/* Lesson completion */}
            <Popover
              className="flex flex-col items-start cursor-default"
              content={
                <div className="flex flex-col gap-1">
                  <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
                    {t("pop_words_mastered")}
                  </span>
                  <span className="text-foreground text-[13px] leading-[1.4]">
                    <span className="font-semibold">{formatNumber(wordsMastered)}</span> mastered / <span className="font-semibold">{formatNumber(words.length)}</span> total = <span className="font-semibold">{formatPercent(masteredPercentage, { decimals: 1 })}</span>
                  </span>
                </div>
              }
            >
              <span className="text-xs text-muted-foreground">Completion</span>
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
                  <circle
                    cx="10" cy="10" r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-black/10"
                  />
                  <circle
                    cx="10" cy="10" r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-primary"
                    strokeDasharray={`${2 * Math.PI * 8}`}
                    strokeDashoffset={`${2 * Math.PI * 8 * (1 - masteredPercentage / 100)}`}
                    transform="rotate(-90 10 10)"
                    style={{ transition: "stroke-dashoffset 0.3s" }}
                  />
                </svg>
                <span className="text-regular-semibold">{formatPercent(masteredPercentage)}</span>
              </div>
            </Popover>

            {/* Average score */}
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Average score</span>
              {averageTestScore !== null ? (
                <div className="flex items-center gap-1.5 text-success">
                  <span className="text-regular-semibold">✓ {formatPercent(averageTestScore)}</span>
                </div>
              ) : (
                <span className="text-regular-semibold text-muted-foreground">—</span>
              )}
            </div>

            {/* Total time */}
            <Popover
              className="flex flex-col items-start cursor-default"
              align="right"
              content={
                <div className="flex flex-col gap-1">
                  <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
                    {t("pop_time_breakdown")}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-foreground text-[13px] leading-[1.4]">
                      {t("pop_study_time")} <span className="font-semibold">{formatDuration(studyTimeSeconds)}</span>
                    </span>
                    <span className="text-foreground text-[13px] leading-[1.4]">
                      {t("pop_test_time")} <span className="font-semibold">{formatDuration(testTimeSeconds)}</span>
                    </span>
                  </div>
                </div>
              }
            >
              <span className="text-xs text-muted-foreground">Total time</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-regular-semibold">{formatDuration(totalTimeSeconds)}</span>
              </div>
            </Popover>
          </div>
        </div>

      {/* Content - Words List or Activity History */}

      <div className={words.length > 0 && !showHistory ? "pb-24" : ""}>
        {showHistory && activityHistory ? (
          <LessonActivityHistory
            activities={activityHistory.activities}
            counts={activityHistory.counts}
            rightContent={
              <Tooltip label={t("tip_show_words")}>
                <button
                  onClick={() => setShowHistory(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-colors"
                >
                  <ClipboardCheck className="h-5 w-5" />
                </button>
              </Tooltip>
            }
          />
        ) : (
          <WordsList
            words={words}
            languageFlag={languageFlag}
            languageName={languageName}
            wordsNotStarted={wordsNotStarted}
            wordsLearning={wordsLearning}
            wordsMastered={wordsMastered}
            lessonTitle={lesson.title}
            lessonNumber={lesson.number}
            onWordSelected={setIsWordSelected}
            rightContent={
              activityHistory && (
                <Tooltip label={t("tip_show_test_history")}>
                  <button
                    onClick={() => setShowHistory(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-beige"
                  >
                    <ClipboardCheck className="h-5 w-5" />
                  </button>
                </Tooltip>
              )
            }
          />
        )}
      </div>

      {/* Fixed footer bar - hidden when showing history */}
      {!showHistory && words.length > 0 && (
        <div className="fixed bottom-0 left-[240px] right-0 z-10 bg-white shadow-bar">
          <div className="flex items-center justify-between gap-4 border-t border-gray-100 px-6 py-4">
            {previousLesson ? (
              <Link
                href={`/lesson/${previousLesson.id}`}
                className="flex min-w-0 max-w-44 shrink-0 items-center gap-2 overflow-hidden text-left transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="text-xs text-muted-foreground">Previous</span>
                  <span className="block min-w-0 truncate text-regular-semibold text-foreground" title={`#${previousLesson.number} ${previousLesson.title}`}>
                    #{previousLesson.number} {previousLesson.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div />
            )}
            <div className="flex flex-1 items-center justify-center gap-4">
              <Button asChild size="xl" className="flex-1 max-w-[240px]">
                <Link href={`/lesson/${lesson.id}/study`}>
                  Study lesson
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="flex-1 max-w-[240px] border-primary text-primary"
                onClick={() => setShowStartTestModal(true)}
              >
                Take test
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            {nextLesson ? (
              <Link
                href={`/lesson/${nextLesson.id}`}
                className="flex min-w-0 max-w-44 shrink-0 items-center gap-2 overflow-hidden text-left transition-colors hover:text-foreground"
              >
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="text-xs text-muted-foreground">Next</span>
                  <span className="block min-w-0 truncate text-regular-semibold text-foreground" title={`#${nextLesson.number} ${nextLesson.title}`}>
                    #{nextLesson.number} {nextLesson.title}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* Start Test Modal */}
      {showStartTestModal && (
        <StartTestModal
          languageName={languageName || "Foreign"}
          lessonTitle={`#${lesson.number} ${lesson.title}`}
          wordCount={words.length}
          wordsWithImages={wordsWithImages}
          onStart={handleStartTest}
          onCancel={() => setShowStartTestModal(false)}
        />
      )}
    </>
  );
}
