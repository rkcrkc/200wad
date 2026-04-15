"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { TestForList } from "@/lib/queries/tests";
import { mapStatus } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface TestRowProps {
  test: TestForList;
  isFirst?: boolean;
  isLast?: boolean;
}

export function TestRow({ test, isFirst, isLast }: TestRowProps) {
  const statusType = mapStatus(test.lessonStatus);

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
        {test.lessonWordCount}
      </td>

      {/* # Mastered */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        {test.wordsMastered}
      </td>

      {/* Completion */}
      <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <div className="flex items-center justify-center gap-2">
          <ProgressRing value={test.completionPercent} size={24} />
          <span className="text-regular-medium text-foreground">
            {test.completionPercent}%
          </span>
        </div>
      </td>

      {/* Take test button - sticky on horizontal scroll */}
      <td className={cn(
        "sticky right-0 bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover",
        isFirst && "rounded-tr-xl",
        isLast && "rounded-br-xl"
      )}>
        <div className="flex justify-end">
          <Button asChild size="sm" className="gap-1">
            <Link href={`/lesson/${test.lessonId}/test`}>
              Take test
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}
