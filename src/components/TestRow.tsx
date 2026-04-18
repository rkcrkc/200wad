"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import { TestForList } from "@/lib/queries/tests";
import { mapStatus, formatNumber, formatPercent } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface TestRowProps {
  test: TestForList;
  isFirst?: boolean;
  isLast?: boolean;
}

export function TestRow({ test, isFirst, isLast }: TestRowProps) {
  const statusType = mapStatus(test.lessonStatus);
  const wordCount = test.lessonWordCount || 0;
  const learnedPct = wordCount > 0 ? Math.round((test.wordsLearned / wordCount) * 100) : 0;
  const masteredPct = wordCount > 0 ? Math.round((test.wordsMastered / wordCount) * 100) : 0;

  return (
    <tr className={cn(
      "group transition-colors hover:bg-bone-hover",
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
        {test.milestone.replace(/\b\w/g, (c) => c.toUpperCase())}
      </td>

      {/* Test # */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        {test.testNumber}
      </td>

      {/* Status */}
      <td className="whitespace-nowrap bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <StatusPill status={statusType} />
      </td>

      {/* # Words */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        <WordsPreviewTooltip
          lessonId={test.lessonId}
          wordCount={wordCount}
        />
      </td>

      {/* # Learned */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        <span className="inline-flex items-center gap-1.5">
          {formatNumber(test.wordsLearned)}
          <span className="rounded-full bg-bone-hover px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {formatPercent(learnedPct)}
          </span>
        </span>
      </td>

      {/* # Mastered */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        <span className="inline-flex items-center gap-1.5">
          {formatNumber(test.wordsMastered)}
          <span className="rounded-full bg-bone-hover px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {formatPercent(masteredPct)}
          </span>
        </span>
      </td>

      {/* Test button - sticky on horizontal scroll */}
      <td className={cn(
        "sticky right-0 z-10 bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover",
        isFirst && "rounded-tr-xl",
        isLast && "rounded-br-xl"
      )}>
        <div className="flex justify-end">
          <Link
            href={`/lesson/${test.lessonId}/test`}
            className="inline-flex items-center gap-[2px] whitespace-nowrap rounded-lg bg-primary px-[12px] py-1.5 text-sm font-medium text-white transition-all hover:gap-[6px] hover:px-[10px]"
          >
            Test
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
