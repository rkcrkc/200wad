"use client";

import { Clock } from "lucide-react";
import type { CumulativeProgress } from "@/lib/queries/stats";
import { Popover } from "@/components/ui/popover";
import {
  formatDuration,
  formatNumber,
  formatPercent,
} from "@/lib/utils/helpers";
import { useText } from "@/context/TextContext";

interface CumulativeProgressCardProps {
  progress: CumulativeProgress;
}

export function CumulativeProgressCard({
  progress,
}: CumulativeProgressCardProps) {
  const { t } = useText();
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Cumulative Progress
      </h3>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {/* Words mastered */}
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">Words mastered</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-regular-semibold">
              {formatNumber(progress.wordsMastered)}
            </span>
          </div>
        </div>

        {/* Words studied */}
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">Words studied</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
            <span className="text-regular-semibold">
              {formatNumber(progress.wordsStudied)}
            </span>
          </div>
        </div>

        {/* Lessons completed */}
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">
            Lessons completed
          </span>
          <span className="text-regular-semibold">
            {progress.lessonsCompleted} / {progress.totalLessons}
          </span>
        </div>

        {/* Course completion */}
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">Course</span>
          <span className="text-regular-semibold">
            {formatPercent(progress.courseCompletionPercent)} complete
          </span>
        </div>

        {/* Total time with study/test split popover */}
        <Popover
          className="flex flex-col items-start cursor-default"
          content={
            <div className="flex flex-col gap-1">
              <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
                {t("pop_time_breakdown")}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground text-[13px] leading-[1.4]">
                  {t("pop_study_time")}{" "}
                  <span className="font-semibold">
                    {formatDuration(progress.studyTimeSeconds)}
                  </span>
                </span>
                <span className="text-foreground text-[13px] leading-[1.4]">
                  {t("pop_test_time")}{" "}
                  <span className="font-semibold">
                    {formatDuration(progress.testTimeSeconds)}
                  </span>
                </span>
              </div>
            </div>
          }
        >
          <span className="text-xs text-muted-foreground">Total time</span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-regular-semibold">
              {formatDuration(progress.totalStudyTimeSeconds)}
            </span>
          </div>
        </Popover>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="bg-success h-full rounded-full transition-all duration-300"
          style={{ width: `${progress.courseCompletionPercent}%` }}
        />
      </div>
    </div>
  );
}
