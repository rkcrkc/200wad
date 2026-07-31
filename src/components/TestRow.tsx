"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusPill } from "@/components/ui/status-pill";
import { SubBadge } from "@/components/ui/sub-badge";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import { XpBadge } from "@/components/ui/xp-badge";
import { LessonStartTestModal } from "@/components/study";
import { TestForList } from "@/lib/queries/tests";
import { mapStatus, formatNumber, formatPercent } from "@/lib/utils/helpers";
import { getMilestoneShortLabel } from "@/lib/utils/milestones";
import { cn } from "@/lib/utils";

interface TestRowProps {
  test: TestForList;
  isFirst?: boolean;
  isLast?: boolean;
  showScore?: boolean;
  showScrollFade?: boolean;
}

export function TestRow({ test, isFirst, isLast, showScore, showScrollFade }: TestRowProps) {
  const statusType = mapStatus(test.lessonStatus);
  const wordCount = test.lessonWordCount || 0;
  const learnedPct = wordCount > 0 ? Math.round((test.wordsLearned / wordCount) * 100) : 0;
  const masteredPct = wordCount > 0 ? Math.round((test.wordsMastered / wordCount) * 100) : 0;
  const [showStartTestModal, setShowStartTestModal] = useState(false);

  // Which test this is (1-Week / 3-Month / Re-test / Ad Hoc). Shared by the
  // desktop column, the mobile meta sub-row, and the mobile Test button.
  const testName = test.isRetest
    ? "Re-test"
    : getMilestoneShortLabel(test.milestone);

  // Rendered twice: inside the row itself on mobile (where the table is a list
  // of rows, not a grid, so there is no action column) and in the dedicated
  // action cell from md up. From md it takes the free width of the action cell
  // (`flex-1`) so buttons line up column-wide instead of each sizing to its own
  // XP value; below md it stays content-sized so it doesn't eat the title.
  const startTestButton = (
    <button
      type="button"
      onClick={() => setShowStartTestModal(true)}
      className="group/btn inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary/90 md:flex-1 md:text-sm"
    >
      {showScore ? "Re-test" : "Start"}
      {/* Desktop-only: on a phone the button has to stay narrow enough to share
          the row with the title, so XP available moves out to the meta sub-row
          (Tests Due) or is dropped (Previous Tests). */}
      <XpBadge
        value={test.maxPoints ?? wordCount * 3}
        variant="on-primary-subtle"
        size="xs"
        className="hidden md:inline-flex"
      />
      <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
    </button>
  );

  return (
    <tr className={cn(
      "group cursor-default transition-colors hover:bg-bone-hover",
      !isFirst && "border-t border-bone-hover"
    )}>
      {/* Lesson number — desktop-only column; on mobile it's prepended to the
          title so the row keeps more width for the name. Corner rounding is
          owned by the tbody (see TestsList). */}
      <td className={cn(
        "hidden bg-white px-6 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell",
        isFirst && "rounded-tl-xl",
        isLast && "rounded-bl-xl"
      )}>
        {test.lessonNumber}
      </td>

      {/* Lesson: emoji + title (meta stacks beneath the title on mobile, and the
          Start button rides along on the right). Extra right padding below md
          keeps that button off the row edge.

          Below md this is the only visible cell, so it owns all four corners of
          the table. From md up the number and action cells sit either side of
          it and reclaim them. */}
      <td className={cn(
        "bg-white px-2 py-3 pr-4 transition-colors group-hover:bg-bone-hover md:py-4 md:pr-2",
        isFirst && "rounded-t-xl md:rounded-t-none",
        isLast && "rounded-b-xl md:rounded-b-none"
      )}>
        <div className="flex items-center gap-3">
          <Link
            href={`/lesson/${test.lessonId}`}
            prefetch
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-base md:h-10 md:w-10 md:text-xl"
          >
            {test.lessonEmoji || "📚"}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/lesson/${test.lessonId}`}
              prefetch
              className="block truncate text-medium-semibold text-foreground"
            >
              <span className="md:hidden">{test.lessonNumber}. </span>{test.lessonTitle}
            </Link>
            {/* Mobile: the milestone always leads, so both tabs open the same
                way. Tests Due follows it with the word count (same text run,
                dot-separated) and trails the XP on offer; Previous Tests follows
                it with the score it got and trails the XP that scored. Desktop
                uses the dedicated columns below. */}
            <div className="mt-1 flex items-center justify-between gap-2 md:hidden">
              <span className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {showScore
                    ? testName
                    : `${testName} · ${formatNumber(wordCount)} ${wordCount === 1 ? "word" : "words"}`}
                </span>
                {showScore && (
                  <span className="flex items-center gap-1.5">
                    <ProgressRing value={test.scorePercent ?? 0} size={18} />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {test.scorePercent != null ? formatPercent(test.scorePercent) : "-"}
                    </span>
                  </span>
                )}
              </span>
              {showScore ? (
                test.pointsEarned != null && (
                  <XpBadge value={test.pointsEarned} variant="earned" size="xs" showPlus />
                )
              ) : (
                <XpBadge
                  value={test.maxPoints ?? wordCount * 3}
                  variant="available"
                  size="xs"
                />
              )}
            </div>
          </div>
          {/* Mobile: the action sits in the row itself. */}
          <div className="flex-shrink-0 md:hidden">{startTestButton}</div>
        </div>
      </td>

      {/* Test Name (milestone) */}
      <td className="hidden bg-white px-2 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        {testName}
      </td>

      {/* Test # */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        {test.testNumber}
      </td>

      {/* Status or Score */}
      <td className="hidden whitespace-nowrap bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover md:table-cell">
        {showScore ? (
          <div className="flex items-center gap-2">
            <ProgressRing value={test.scorePercent ?? 0} size={24} />
            <span className="text-regular-medium text-foreground">
              {test.scorePercent != null ? formatPercent(test.scorePercent) : "-"}
            </span>
          </div>
        ) : (
          <StatusPill status={statusType} />
        )}
      </td>

      {/* XP earned — Previous Tests only. There is no matching "XP available"
          column on Tests Due: that number now lives inside the Start test
          button, where it reads as the reward for the action. */}
      {showScore && (
        <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
          {test.pointsEarned != null && (
            <XpBadge value={test.pointsEarned} variant="earned" showPlus />
          )}
        </td>
      )}

      {/* # Words */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        <WordsPreviewTooltip
          lessonId={test.lessonId}
          wordCount={wordCount}
        />
      </td>

      {/* # Learned (total with sub-badge) or Newly Learned (plain count) */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        {showScore ? (
          formatNumber(test.newlyLearned ?? 0)
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {formatNumber(test.wordsLearned)}
            <SubBadge>
              {formatPercent(learnedPct)}
            </SubBadge>
          </span>
        )}
      </td>

      {/* # Mastered (total with sub-badge) or Newly Mastered (plain count) */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        {showScore ? (
          formatNumber(test.newlyMastered ?? 0)
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {formatNumber(test.wordsMastered)}
            <SubBadge>
              {formatPercent(masteredPct)}
            </SubBadge>
          </span>
        )}
      </td>

      {/* Actions — a dedicated column only from md up, where the table really is
          a grid. Below md it's `display:none` and the button rides in the lesson
          cell instead, so there's no narrow column squeezing the row. Sticky on
          horizontal scroll; width mirrors the header cell. */}
      <td className={cn(
        "sticky right-0 z-10 hidden bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover md:table-cell md:w-[196px]",
        isFirst && "rounded-tr-xl",
        isLast && "rounded-br-xl",
        showScrollFade && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-white before:transition-colors group-hover:before:to-bone-hover"
      )}>
        <div className="flex items-center justify-end gap-2">
          {startTestButton}
          {/* Preview is desktop-only — it's hover-labelled, and the lesson title
              already links to the same place. */}
          <Tooltip label="Preview lesson" align="right">
            <Link
              href={`/lesson/${test.lessonId}`}
              prefetch
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
            </Link>
          </Tooltip>
        </div>
      </td>

      {showStartTestModal && (
        <LessonStartTestModal
          lessonId={test.lessonId}
          lessonTitle={test.lessonTitle}
          wordCount={wordCount}
          milestone={test.isDue && test.milestone ? test.milestone : null}
          onCancel={() => setShowStartTestModal(false)}
        />
      )}
    </tr>
  );
}
