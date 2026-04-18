"use client";

import { useRouter } from "next/navigation";
import { BookOpen, ChevronRight, ClipboardPen, Lock } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { SubBadge } from "@/components/ui/sub-badge";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import { LessonWithProgress, LessonMilestoneScores } from "@/lib/queries";
import { mapStatus, formatNumber, formatPercent } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface LessonRowProps {
  lesson: LessonWithProgress;
  isFirst?: boolean;
  isLast?: boolean;
  showStats?: boolean;
  milestoneScores?: LessonMilestoneScores;
  onLockedClick?: (lesson: LessonWithProgress) => void;
}

export function LessonRow({ lesson, isFirst, isLast, showStats, milestoneScores, onLockedClick }: LessonRowProps) {
  const router = useRouter();
  const statusType = mapStatus(lesson.status, lesson.isLocked);
  const wordCount = lesson.word_count ?? 0;

  const handleClick = () => {
    if (lesson.isLocked) {
      onLockedClick?.(lesson);
      return;
    }
    router.push(`/lesson/${lesson.id}`);
  };

  // Helper to format score display
  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "-";
    return formatPercent(score);
  };

  // Stats view
  if (showStats) {
    return (
      <tr
        onClick={handleClick}
        className={cn(
          "group cursor-pointer transition-colors hover:bg-bone-hover",
          !isFirst && "border-t border-bone-hover",
          lesson.isLocked && "opacity-60"
        )}
      >
        {/* Lesson number */}
        <td className={cn(
          "bg-white px-6 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover",
          isFirst && "rounded-tl-xl",
          isLast && "rounded-bl-xl"
        )}>
          {lesson.number}
        </td>

        {/* Lesson: emoji + title */}
        <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl">
              {lesson.emoji || "📚"}
            </div>
            <div className="truncate text-medium-semibold text-foreground">
              {lesson.title}
            </div>
          </div>
        </td>

        {/* Initial */}
        <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
          {formatScore(milestoneScores?.initial)}
        </td>

        {/* Day */}
        <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
          {formatScore(milestoneScores?.day)}
        </td>

        {/* Week */}
        <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
          {formatScore(milestoneScores?.week)}
        </td>

        {/* Month */}
        <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
          {formatScore(milestoneScores?.month)}
        </td>

        {/* Qtr */}
        <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
          {formatScore(milestoneScores?.qtr)}
        </td>

        {/* Year */}
        <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
          {formatScore(milestoneScores?.year)}
        </td>

        {/* Other */}
        <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
          {formatScore(milestoneScores?.other)}
        </td>

        {/* Overall */}
        <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
          {formatScore(milestoneScores?.overall)}
        </td>

        {/* Take test button / Lock icon - sticky on horizontal scroll */}
        <td className={cn(
          "sticky right-0 z-10 bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover",
          isFirst && "rounded-tr-xl",
          isLast && "rounded-br-xl"
        )}>
          <div className="flex justify-end">
            {lesson.isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/lesson/${lesson.id}/test`);
                }}
                className="whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Test
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // Default view
  return (
    <tr
      onClick={handleClick}
      className={cn(
        "group cursor-pointer transition-colors hover:bg-bone-hover",
        !isFirst && "border-t border-bone-hover",
        lesson.isLocked && "opacity-60"
      )}
    >
      {/* Lesson number */}
      <td className={cn(
        "bg-white px-6 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover",
        isFirst && "rounded-tl-xl",
        isLast && "rounded-bl-xl"
      )}>
        {lesson.number}
      </td>

      {/* Lesson: emoji + title */}
      <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl">
            {lesson.emoji || "📚"}
          </div>
          <div className="truncate text-medium-semibold text-foreground">
            {lesson.title}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="whitespace-nowrap bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <StatusPill status={statusType} />
      </td>

      {/* # Words */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        <WordsPreviewTooltip
          lessonId={lesson.id}
          wordCount={lesson.word_count ?? 0}
          isAutoLesson={lesson.isAutoLesson}
        />
      </td>

      {/* # Learned */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        <span className="inline-flex items-center gap-1.5">
          {formatNumber(lesson.wordsLearned)}
          <SubBadge>
            {formatPercent(wordCount > 0 ? Math.round((lesson.wordsLearned / wordCount) * 100) : 0)}
          </SubBadge>
        </span>
      </td>

      {/* # Mastered */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        <span className="inline-flex items-center gap-1.5">
          {formatNumber(lesson.wordsMastered)}
          <SubBadge>
            {formatPercent(wordCount > 0 ? Math.round((lesson.wordsMastered / wordCount) * 100) : 0)}
          </SubBadge>
        </span>
      </td>

      {/* Actions / Lock - sticky on horizontal scroll */}
      <td className={cn(
        "sticky right-0 z-10 bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover",
        isFirst && "rounded-tr-xl",
        isLast && "rounded-br-xl"
      )}>
        <div className="flex items-center justify-end gap-1">
          {lesson.isLocked ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <>
              <div className="group/study relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/lesson/${lesson.id}/study`);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/study:opacity-100">
                  Study lesson
                </span>
              </div>
              <div className="group/test relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/lesson/${lesson.id}/test`);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
                >
                  <ClipboardPen className="h-4 w-4" />
                </button>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/test:opacity-100">
                  Take test
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
