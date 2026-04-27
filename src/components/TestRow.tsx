"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusPill } from "@/components/ui/status-pill";
import { SubBadge } from "@/components/ui/sub-badge";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import { LessonStartTestModal } from "@/components/study";
import { TestForList } from "@/lib/queries/tests";
import { mapStatus, formatNumber, formatPercent } from "@/lib/utils/helpers";
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

  return (
    <tr className={cn(
      "group cursor-default transition-colors hover:bg-bone-hover",
      !isFirst && "border-t border-bone-hover"
    )}>
      {/* Lesson number */}
      <td className={cn(
        "bg-white px-6 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover",
        isFirst && "rounded-tl-xl",
        isLast && "rounded-bl-xl"
      )}>
        {test.lessonNumber}
      </td>

      {/* Lesson: emoji + title */}
      <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <Link
          href={`/lesson/${test.lessonId}`}
          className="flex items-center gap-3 transition-colors hover:text-primary"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl">
            {test.lessonEmoji || "📚"}
          </div>
          <div className="truncate text-medium-semibold text-foreground">
            {test.lessonTitle}
          </div>
        </Link>
      </td>

      {/* Test Name (milestone) */}
      <td className="bg-white px-2 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        {test.isRetest
          ? "Re-test"
          : test.milestone === "other"
            ? "Ad Hoc"
            : test.milestone.replace(/\b\w/g, (c) => c.toUpperCase())}
      </td>

      {/* Test # */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        {test.testNumber}
      </td>

      {/* Status or Score */}
      <td className="whitespace-nowrap bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
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

      {/* # Words */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        <WordsPreviewTooltip
          lessonId={test.lessonId}
          wordCount={wordCount}
        />
      </td>

      {/* # Learned (total with sub-badge) or Newly Learned (plain count) */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
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
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
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

      {/* Actions - sticky on horizontal scroll */}
      <td className={cn(
        "sticky right-0 z-10 bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover",
        isFirst && "rounded-tr-xl",
        isLast && "rounded-br-xl",
        showScrollFade && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-white before:transition-colors group-hover:before:to-bone-hover"
      )}>
        <div className="flex items-center justify-end gap-2">
          <Tooltip label="Preview lesson">
            <Link
              href={`/lesson/${test.lessonId}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
            </Link>
          </Tooltip>
          <button
            type="button"
            onClick={() => setShowStartTestModal(true)}
            className="group/btn inline-flex items-center gap-0.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
          >
            Test
            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
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
