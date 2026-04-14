"use client";

import { Popover } from "@/components/ui/popover";
import { formatNumber, formatRatioPercent } from "@/lib/utils/helpers";
import { useText } from "@/context/TextContext";

interface CourseStatsBarProps {
  wordsStudied: number;
  wordsMastered: number;
  totalWords: number;
  lessonsStudied: number;
  lessonsMastered: number;
  totalLessons: number;
}

export function CourseStatsBar({
  wordsStudied,
  wordsMastered,
  totalWords,
  lessonsStudied,
  lessonsMastered,
  totalLessons,
}: CourseStatsBarProps) {
  const { t } = useText();

  return (
    <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
      {/* Words studied */}
      <Popover
        className="flex flex-col items-start gap-1 cursor-default"
        content={
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-[14px] leading-[1.4] font-semibold">{t("pop_words_studied")}</span>
            <span className="text-foreground text-[13px] leading-[1.4]">
              <span className="font-semibold">{formatNumber(wordsStudied)}</span> studied / <span className="font-semibold">{formatNumber(totalWords)}</span> total = {formatRatioPercent(wordsStudied, totalWords, { decimals: 1 })}
            </span>
          </div>
        }
      >
        <span className="text-xs text-muted-foreground">{t("pop_words_studied")}</span>
        <div className="flex items-center">
          <span className="text-regular-semibold">
            {formatNumber(wordsStudied)} ({formatRatioPercent(wordsStudied, totalWords)})
          </span>
        </div>
      </Popover>

      {/* Words mastered */}
      <Popover
        className="flex flex-col items-start gap-1 cursor-default"
        content={
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-[14px] leading-[1.4] font-semibold">{t("pop_words_mastered")}</span>
            <span className="text-foreground text-[13px] leading-[1.4]">
              <span className="font-semibold">{formatNumber(wordsMastered)}</span> mastered / <span className="font-semibold">{formatNumber(totalWords)}</span> total = {formatRatioPercent(wordsMastered, totalWords, { decimals: 1 })}
            </span>
          </div>
        }
      >
        <span className="text-xs text-muted-foreground">{t("pop_words_mastered")}</span>
        <div className="flex items-center">
          <span className="text-regular-semibold">
            {formatNumber(wordsMastered)} ({formatRatioPercent(wordsMastered, totalWords)})
          </span>
        </div>
      </Popover>

      {/* Lessons studied */}
      <Popover
        className="flex flex-col items-start gap-1 cursor-default"
        content={
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-[14px] leading-[1.4] font-semibold">{t("pop_lessons_studied")}</span>
            <span className="text-foreground text-[13px] leading-[1.4]">
              <span className="font-semibold">{formatNumber(lessonsStudied)}</span> studied / <span className="font-semibold">{formatNumber(totalLessons)}</span> total = {formatRatioPercent(lessonsStudied, totalLessons, { decimals: 1 })}
            </span>
          </div>
        }
      >
        <span className="text-xs text-muted-foreground">{t("pop_lessons_studied")}</span>
        <div className="flex items-center">
          <span className="text-regular-semibold">
            {formatNumber(lessonsStudied)} / {formatNumber(totalLessons)}
          </span>
        </div>
      </Popover>

      {/* Lessons mastered */}
      <Popover
        className="flex flex-col items-start gap-1 cursor-default"
        content={
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-[14px] leading-[1.4] font-semibold">{t("pop_lessons_mastered")}</span>
            <span className="text-foreground text-[13px] leading-[1.4]">
              <span className="font-semibold">{formatNumber(lessonsMastered)}</span> mastered / <span className="font-semibold">{formatNumber(totalLessons)}</span> total = {formatRatioPercent(lessonsMastered, totalLessons, { decimals: 1 })}
            </span>
          </div>
        }
      >
        <span className="text-xs text-muted-foreground">{t("pop_lessons_mastered")}</span>
        <div className="flex items-center">
          <span className="text-regular-semibold">
            {formatNumber(lessonsMastered)} / {formatNumber(totalLessons)}
          </span>
        </div>
      </Popover>
    </div>
  );
}
