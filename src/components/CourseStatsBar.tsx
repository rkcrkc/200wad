"use client";

import type { ReactNode } from "react";
import { Popover } from "@/components/ui/popover";
import { SubBadge } from "@/components/ui/sub-badge";
import { MobileStatsDropdown, type MobileStat } from "@/components/ui/mobile-stats-dropdown";
import { formatNumber, formatRatioPercent } from "@/lib/utils/helpers";
import { useText } from "@/context/TextContext";

interface CourseStatsBarProps {
  wordsLearned: number;
  wordsMastered: number;
  totalWords: number;
  lessonsLearned: number;
  lessonsMastered: number;
  totalLessons: number;
  /** Controls pinned to the trailing edge of the mobile stats row (e.g. the
   *  LessonsList search), hidden on desktop where they live in the toolbar. */
  mobileTrailing?: ReactNode;
}

export function CourseStatsBar({
  wordsLearned,
  wordsMastered,
  totalWords,
  lessonsLearned,
  lessonsMastered,
  totalLessons,
  mobileTrailing,
}: CourseStatsBarProps) {
  const { t } = useText();

  // Flat list used only for the mobile dropdown (the desktop row keeps its
  // richer per-stat popovers below). The first entry is the one shown inline.
  const mobileStats: MobileStat[] = [
    {
      label: "Words learned",
      value: <StatValue count={wordsLearned} total={totalWords} />,
    },
    {
      label: t("pop_words_mastered"),
      value: <StatValue count={wordsMastered} total={totalWords} />,
    },
    {
      label: "Lessons learned",
      value: <StatValue count={lessonsLearned} total={totalLessons} />,
    },
    {
      label: t("pop_lessons_mastered"),
      value: <StatValue count={lessonsMastered} total={totalLessons} />,
    },
  ];

  return (
    <>
      <MobileStatsDropdown stats={mobileStats} trailing={mobileTrailing} />

      {/* Desktop: full four-stat row with per-stat popovers. */}
      <div className="hidden cursor-default flex-wrap items-center gap-x-8 gap-y-2 md:flex">
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
          <SubBadge variant="header">
            {formatRatioPercent(wordsLearned, totalWords)}
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
          <SubBadge variant="header">
            {formatRatioPercent(wordsMastered, totalWords)}
          </SubBadge>
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
          <SubBadge variant="header">
            {formatRatioPercent(lessonsLearned, totalLessons)}
          </SubBadge>
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
          <SubBadge variant="header">
            {formatRatioPercent(lessonsMastered, totalLessons)}
          </SubBadge>
        </div>
      </Popover>
      </div>
    </>
  );
}

/** "N / total" plus its percentage badge — the shape every stat here takes. */
function StatValue({ count, total }: { count: number; total: number }) {
  return (
    <>
      <span className="text-regular-semibold">
        {formatNumber(count)} / {formatNumber(total)}
      </span>
      <SubBadge variant="header">{formatRatioPercent(count, total)}</SubBadge>
    </>
  );
}
