"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { WordsList } from "@/components/WordsList";
import { LessonActivityHistory } from "@/components/LessonActivityHistory";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StartTestModal } from "@/components/study";
import { formatDuration, formatNumber, formatPercent } from "@/lib/utils/helpers";
import { SubBadge } from "@/components/ui/sub-badge";
import { WordWithDetails } from "@/lib/queries/words";
import { LessonActivityHistoryResult } from "@/lib/queries";
import { Lesson } from "@/types/database";
import { TestType } from "@/types/test";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Popover } from "@/components/ui/popover";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressRing } from "@/components/ui/progress-ring";
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
  wordsLearned: number;
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
  wordsLearned,
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
      <div className="mb-8 flex flex-col gap-4">
        {/* Row 1: Lesson # + Status pill */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-regular-semibold text-black-80">
            Lesson #{lesson.number}
          </p>
          {(() => {
            const lessonStatus = masteredPercentage === 100
              ? "mastered" as const
              : (wordsLearned + wordsMastered) >= words.length && words.length > 0
                ? "learned" as const
                : wordsNotStarted === words.length
                  ? "notStarted" as const
                  : "learning" as const;
            return (
              <StatusPill
                status={lessonStatus}
                bgOverride={lessonStatus === "notStarted" ? "#FFFFFF" : undefined}
              />
            );
          })()}
        </div>

        {/* Row 2: Title + Stats */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
          <h1 className="flex items-center gap-4 text-xxl-semibold">
            {lesson.emoji && <span className="text-2xl">{lesson.emoji}</span>}
            {lesson.title}
          </h1>

          {/* Stats */}
          <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
            {/* Words learned */}
            <Popover
              className="flex flex-col items-start gap-1.5 cursor-default"
              content={
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-[14px] leading-[1.4] font-semibold">Words learned</span>
                  <span className="text-foreground text-[13px] leading-[1.4]">
                    <span className="font-semibold">{formatNumber(wordsLearned + wordsMastered)}</span> learned / <span className="font-semibold">{formatNumber(words.length)}</span> total = {formatPercent(words.length > 0 ? ((wordsLearned + wordsMastered) / words.length) * 100 : 0, { decimals: 1 })}
                  </span>
                </div>
              }
            >
              <span className="text-xs text-muted-foreground">Words learned</span>
              <div className="flex items-center gap-2">
                <ProgressRing value={words.length > 0 ? ((wordsLearned + wordsMastered) / words.length) * 100 : 0} size={20} />
                <span className="text-regular-semibold">
                  {formatNumber(wordsLearned + wordsMastered)} / {formatNumber(words.length)}
                </span>
                <SubBadge variant="header">
                  {formatPercent(words.length > 0 ? ((wordsLearned + wordsMastered) / words.length) * 100 : 0)}
                </SubBadge>
              </div>
            </Popover>

            {/* Words mastered */}
            <Popover
              className="flex flex-col items-start gap-1.5 cursor-default"
              content={
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-[14px] leading-[1.4] font-semibold">{t("pop_words_mastered")}</span>
                  <span className="text-foreground text-[13px] leading-[1.4]">
                    <span className="font-semibold">{formatNumber(wordsMastered)}</span> mastered / <span className="font-semibold">{formatNumber(words.length)}</span> total = {formatPercent(masteredPercentage, { decimals: 1 })}
                  </span>
                </div>
              }
            >
              <span className="text-xs text-muted-foreground">Words mastered</span>
              <div className="flex items-center gap-2">
                <ProgressRing value={masteredPercentage} size={20} />
                <span className="text-regular-semibold">
                  {formatNumber(wordsMastered)} / {formatNumber(words.length)}
                </span>
                <SubBadge variant="header">
                  {formatPercent(masteredPercentage)}
                </SubBadge>
              </div>
            </Popover>

            {/* Total time */}
            <Popover
              className="flex flex-col items-start gap-1.5 cursor-default"
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
      </div>

      {/* Content - Words List or Activity History */}

      <div className={words.length > 0 && !showHistory ? "pb-24" : ""}>
        {/* Activity History - keep mounted, toggle visibility */}
        {activityHistory && (
          <div className={showHistory ? "" : "hidden"}>
            <LessonActivityHistory
              activities={activityHistory.activities}
              counts={activityHistory.counts}
              lessonWordCount={lesson.word_count || undefined}
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
          </div>
        )}

        {/* Words List - keep mounted, toggle visibility */}
        <div className={showHistory ? "hidden" : ""}>
          <WordsList
            words={words}
            languageFlag={languageFlag}
            languageName={languageName}
            wordsNotStarted={wordsNotStarted}
            wordsLearning={wordsLearning}
            wordsLearned={wordsLearned}
            wordsMastered={wordsMastered}
            averageTestScore={averageTestScore}
            lessonTitle={lesson.title}
            lessonNumber={lesson.number}
            onWordSelected={setIsWordSelected}
            rightContent={
              activityHistory && (
                <Tooltip label="Show study history">
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
        </div>
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
              <PrimaryButton
                className="flex-1 max-w-[240px]"
                href={`/lesson/${lesson.id}/study`}
              >
                Study lesson
              </PrimaryButton>
              <PrimaryButton
                variant="outline"
                className="flex-1 max-w-[240px]"
                onClick={() => setShowStartTestModal(true)}
              >
                Take test
              </PrimaryButton>
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
