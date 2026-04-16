"use client";

import { Popover } from "@/components/ui/popover";
import { formatNumber, formatRatioPercent } from "@/lib/utils/helpers";
import { useText } from "@/context/TextContext";

interface CourseStatsBarProps {
  wordsLearned: number;
  wordsMastered: number;
  totalWords: number;
  lessonsLearned: number;
  lessonsMastered: number;
  totalLessons: number;
}

export function CourseStatsBar({
  wordsLearned,
  wordsMastered,
  totalWords,
  lessonsLearned,
  lessonsMastered,
  totalLessons,
}: CourseStatsBarProps) {
  const { t } = useText();

  return (
    <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
      {/* Words learned */}
      <Popover
        className="flex flex-col items-start gap-1.5 cursor-default"
        content={
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-[14px] leading-[1.4] font-semibold">Words learned</span>
            <span className="text-foreground text-[13px] leading-[1.4]">
              <span className="font-semibold">{formatNumber(wordsLearned)}</span> learned / <span className="font-semibold">{formatNumber(totalWords)}</span> total = {formatRatioPercent(wordsLearned, totalWords, { decimals: 1 })}
            </span>
          </div>
        }
      >
        <span className="text-xs text-muted-foreground">Words learned</span>
        <div className="flex items-center gap-2">
          <span className="text-regular-semibold">
            {formatNumber(wordsLearned)} / {formatNumber(totalWords)}
          </span>
          <span className="rounded-full bg-beige px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {formatRatioPercent(wordsLearned, totalWords)}
          </span>
        </div>
      </Popover>

      {/* Words mastered */}
      <Popover
        className="flex flex-col items-start gap-1.5 cursor-default"
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
        <div className="flex items-center gap-2">
          <span className="text-regular-semibold">
            {formatNumber(wordsMastered)} / {formatNumber(totalWords)}
          </span>
          <span className="rounded-full bg-beige px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {formatRatioPercent(wordsMastered, totalWords)}
          </span>
        </div>
      </Popover>

      {/* Lessons learned */}
      <Popover
        className="flex flex-col items-start gap-1.5 cursor-default"
        content={
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-[14px] leading-[1.4] font-semibold">Lessons learned</span>
            <span className="text-foreground text-[13px] leading-[1.4]">
              <span className="font-semibold">{formatNumber(lessonsLearned)}</span> learned / <span className="font-semibold">{formatNumber(totalLessons)}</span> total = {formatRatioPercent(lessonsLearned, totalLessons, { decimals: 1 })}
            </span>
          </div>
        }
      >
        <span className="text-xs text-muted-foreground">Lessons learned</span>
        <div className="flex items-center gap-2">
          <span className="text-regular-semibold">
            {formatNumber(lessonsLearned)} / {formatNumber(totalLessons)}
          </span>
          <span className="rounded-full bg-beige px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {formatRatioPercent(lessonsLearned, totalLessons)}
          </span>
        </div>
      </Popover>

      {/* Lessons mastered */}
      <Popover
        className="flex flex-col items-start gap-1.5 cursor-default"
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
        <div className="flex items-center gap-2">
          <span className="text-regular-semibold">
            {formatNumber(lessonsMastered)} / {formatNumber(totalLessons)}
          </span>
          <span className="rounded-full bg-beige px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {formatRatioPercent(lessonsMastered, totalLessons)}
          </span>
        </div>
      </Popover>
    </div>
  );
}
