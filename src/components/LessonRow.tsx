"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronRight, ClipboardPen, Lock } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { SubBadge } from "@/components/ui/sub-badge";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import { XpBadge } from "@/components/ui/xp-badge";
import { LessonStartTestModal } from "@/components/study";
import type { LessonWithProgress } from "@/lib/queries/lessons";
import type { LessonMilestoneScores } from "@/lib/queries/tests";
import { mapStatus, formatNumber, formatPercent } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface LessonRowProps {
  lesson: LessonWithProgress;
  isFirst?: boolean;
  isLast?: boolean;
  showStats?: boolean;
  milestoneScores?: LessonMilestoneScores;
  onLockedClick?: (lesson: LessonWithProgress) => void;
  showScrollFade?: boolean;
}

export function LessonRow({ lesson, isFirst, isLast, showStats, milestoneScores, onLockedClick, showScrollFade }: LessonRowProps) {
  const router = useRouter();
  const statusType = mapStatus(lesson.status, lesson.isLocked);
  const wordCount = lesson.word_count ?? 0;
  const [showStartTestModal, setShowStartTestModal] = useState(false);

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
          "bg-white px-4 py-3 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:px-6 md:py-4",
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
          isLast && "rounded-br-xl",
          showScrollFade && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-white before:transition-colors group-hover:before:to-bone-hover"
        )}>
          <div className="flex justify-end">
            {lesson.isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStartTestModal(true);
                }}
                className="whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Test
              </button>
            )}
          </div>
        </td>

        {showStartTestModal && (
          <LessonStartTestModal
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            wordCount={wordCount}
            onCancel={() => setShowStartTestModal(false)}
          />
        )}
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
      {/* Lesson number — leading column on every breakpoint (matches WordRow):
          compact with smaller text and tighter padding on mobile, restored at
          md. Owns the row's left corners. */}
      <td className={cn(
        "w-10 bg-white py-4 pl-3 pr-1 text-xs-medium transition-colors group-hover:bg-bone-hover md:w-auto md:px-6 md:text-regular-medium",
        isFirst && "rounded-tl-xl",
        isLast && "rounded-bl-xl"
      )}>
        {lesson.number}
      </td>

      {/* Lesson: emoji + title (status stacks beneath the title on mobile, and
          the chevron rides along on the right).

          On mobile it's the last visible cell (the number sits to its left and
          the action cell is hidden), so it owns the row's right corners. From
          md up the action cell reclaims them. */}
      <td className={cn(
        "bg-white px-2 py-3 pr-4 transition-colors group-hover:bg-bone-hover md:py-4 md:pr-2",
        isFirst && "rounded-tr-xl md:rounded-none",
        isLast && "rounded-br-xl md:rounded-none"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-base md:h-10 md:w-10 md:text-xl">
            {lesson.emoji || "📚"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-medium-semibold text-foreground">
              {lesson.title}
            </div>
            {/* Mobile: available XP leads, then the word count; status pill
                trails. Desktop uses the dedicated columns below. */}
            <div className="mt-1 flex items-center justify-between gap-2 md:hidden">
              <span className="flex items-center gap-2">
                <XpBadge value={wordCount * 3} variant="available" size="xs" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {formatNumber(wordCount)} {wordCount === 1 ? "word" : "words"}
                </span>
              </span>
              <StatusPill status={statusType} size="sm" />
            </div>
          </div>
          {/* Mobile: the row affordance sits in the row itself. The study/test
              shortcuts are desktop-only, so below md this is just the chevron
              (or the lock) — no column needed for it. */}
          <div className="flex-shrink-0 md:hidden">
            {lesson.isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </td>

      {/* Status — desktop-only column; on mobile it moves beneath the name. */}
      <td className="hidden whitespace-nowrap bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover md:table-cell">
        <StatusPill status={statusType} />
      </td>

      {/* XP available — `word_count × 3` (one perfect single-direction test).
          Yellow theming matches the header daily-goal pill. */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        <XpBadge value={wordCount * 3} variant="available" />
      </td>

      {/* # Words */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        <WordsPreviewTooltip
          lessonId={lesson.id}
          wordCount={lesson.word_count ?? 0}
          isAutoLesson={lesson.isAutoLesson}
        />
      </td>

      {/* # Learned */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        <span className="inline-flex items-center gap-1.5">
          {formatNumber(lesson.wordsLearned)}
          <SubBadge>
            {formatPercent(wordCount > 0 ? Math.round((lesson.wordsLearned / wordCount) * 100) : 0)}
          </SubBadge>
        </span>
      </td>

      {/* # Mastered */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        <span className="inline-flex items-center gap-1.5">
          {formatNumber(lesson.wordsMastered)}
          <SubBadge>
            {formatPercent(wordCount > 0 ? Math.round((lesson.wordsMastered / wordCount) * 100) : 0)}
          </SubBadge>
        </span>
      </td>

      {/* Actions / Lock — a dedicated column only from md up, where the table
          really is a grid. Below md it's `display:none` and the chevron rides in
          the lesson cell instead, so there's no narrow column squeezing the row.
          Sticky on horizontal scroll; width mirrors the header cell. */}
      <td className={cn(
        "sticky right-0 z-10 hidden bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover md:table-cell md:w-[140px]",
        isFirst && "rounded-tr-xl",
        isLast && "rounded-br-xl",
        showScrollFade && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-white before:transition-colors group-hover:before:to-bone-hover"
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
                    setShowStartTestModal(true);
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

      {showStartTestModal && (
        <LessonStartTestModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          wordCount={wordCount}
          onCancel={() => setShowStartTestModal(false)}
        />
      )}
    </tr>
  );
}
