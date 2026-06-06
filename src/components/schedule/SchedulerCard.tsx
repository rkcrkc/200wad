"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardPen, Eye } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StatusPill } from "@/components/ui/status-pill";
import { ScrollablePills } from "./ScrollablePills";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import { LessonStartTestModal } from "@/components/study";
import type { LessonForScheduler } from "@/lib/queries/schedule";
import { isAutoLesson } from "@/lib/queries/auto-lessons";
import { useText } from "@/context/TextContext";
import { mapStatus } from "@/lib/utils/helpers";

interface SchedulerCardProps {
  lesson: LessonForScheduler;
  mode: "test" | "lesson";
  /** When true, the card's top corners are squared off so folder tabs can sit flush. */
  flushTop?: boolean;
}

// Compact milestone label used for both the kicker above the title and the
// action button. Matches the language used in `learning.test_due`
// notifications and the StartTestModal.
const MILESTONE_LABEL: Record<string, string> = {
  initial: "first",
  "1-day": "1-day",
  "1-week": "1-week",
  "1-month": "1-month",
  "1-quarter": "1-quarter",
  "1-year": "1-year",
};

function milestoneShortLabel(milestone: string | undefined | null): string | null {
  if (!milestone) return null;
  return MILESTONE_LABEL[milestone] ?? milestone;
}

export function SchedulerCard({ lesson, mode, flushTop = false }: SchedulerCardProps) {
  const { t } = useText();
  const router = useRouter();
  const isTest = mode === "test";
  const isAuto = isAutoLesson(lesson.id);
  const statusType = mapStatus(lesson.status || "");
  const [showStartTestModal, setShowStartTestModal] = useState(false);
  const milestoneLabel = isTest ? milestoneShortLabel(lesson.nextMilestone) : null;
  // For test cards we surface the milestone (e.g. "1-week test"); for the
  // weekly Worst Words auto-lesson we use a "Weekly review" cue; otherwise
  // we use a generic "New lesson" cue so all modes get the same
  // pulse-kicker pairing.
  const kickerLabel = isTest
    ? milestoneLabel
      ? `${milestoneLabel} test`
      : "Test"
    : isAuto
      ? "Weekly review"
      : "New lesson";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white shadow-card transition-shadow duration-300 hover:shadow-[0px_12px_32px_-8px_rgba(0,0,0,0.18)] ${
        flushTop ? "rounded-t-none" : ""
      }`}
    >
      <div className="flex min-h-[450px] flex-col gap-0 md:flex-row md:items-stretch md:gap-8">
        {/* Lesson Image */}
        <div className="relative flex h-[220px] w-full flex-shrink-0 items-center justify-center overflow-hidden md:h-auto md:w-full md:max-w-[340px]">
          {lesson.imageUrl ? (
            <img
              src={lesson.imageUrl}
              alt={lesson.title}
              className="h-full w-full object-contain pl-4"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-16 w-16 text-gray-300" />
            </div>
          )}
        </div>

        {/* Lesson Info */}
        <div className="flex min-w-0 flex-1 flex-col p-8">
          {/* Top row — milestone kicker badge on the left, word count + status on the right.
              Test mode gets the milestone (e.g. "1-WEEK TEST"); lesson mode gets "NEW LESSON". */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 self-start rounded-md bg-primary/10 px-3 py-1.5">
              <PulseDot />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                {kickerLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WordsPreviewTooltip
                lessonId={lesson.id}
                wordCount={lesson.word_count || lesson.sampleWords.length}
                variant="pill"
              />
              {/* XP chip — `word_count × 3` (single-direction perfect test). */}
              <Tooltip label="XP available — one perfect test scores 3 XP per word">
                <span className="inline-flex items-center justify-center rounded-md border border-yellow-400 bg-yellow-50 px-2 py-0.5 text-xs-medium text-foreground">
                  {((lesson.word_count || lesson.sampleWords.length) * 3).toLocaleString()} XP
                </span>
              </Tooltip>
              <StatusPill status={statusType} />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            {/* Lesson number — sits directly above the title. Auto-lessons
                (e.g. Worst Words) don't have a real lesson number; the
                "Weekly review" kicker above already provides context, so
                we omit this line for them. */}
            {!isAuto && (
              <p className="mb-3 text-regular-semibold text-muted-foreground">
                {`Lesson #${lesson.number}`}
              </p>
            )}

            {/* Title */}
            <h2 className="mb-4 truncate text-[36px] font-semibold leading-tight text-foreground">
              {lesson.title}
            </h2>

            {/* Word Tags - 3 rows, horizontally scrollable */}
            <ScrollablePills words={lesson.sampleWords} rows={3} />
          </div>

          {/* Action Buttons */}
          <div className="mt-auto flex items-center gap-3 pt-10">
            {isTest ? (
              <span className="animate-button-pulse-delayed inline-flex flex-1 rounded-xl">
                <PrimaryButton
                  className="animate-button-pulse w-full"
                  onClick={() => setShowStartTestModal(true)}
                >
                  {milestoneLabel ? `Start ${milestoneLabel} test` : "Start test"}
                </PrimaryButton>
              </span>
            ) : (
              <span className="animate-button-pulse-delayed inline-flex flex-1 rounded-xl">
                <PrimaryButton
                  className="animate-button-pulse w-full"
                  href={`/lesson/${lesson.id}/study`}
                >
                  Study lesson
                </PrimaryButton>
              </span>
            )}

            <div className="flex items-center">
              {isTest ? (
                <Tooltip label={t("tip_study_lesson")}>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={() => router.push(`/lesson/${lesson.id}/study`)}
                  >
                    <BookOpen className="size-5" />
                  </Button>
                </Tooltip>
              ) : (
                <Tooltip label={t("tip_take_test")}>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={() => setShowStartTestModal(true)}
                  >
                    <ClipboardPen className="size-5" />
                  </Button>
                </Tooltip>
              )}

              <Tooltip label={t("tip_preview_lesson")}>
                <Button asChild variant="ghost" size="icon-lg">
                  <Link href={`/lesson/${lesson.id}`} prefetch>
                    <Eye className="size-5" />
                  </Link>
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {showStartTestModal && (
        <LessonStartTestModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          wordCount={lesson.word_count ?? lesson.sampleWords.length}
          milestone={lesson.nextMilestone ?? null}
          onCancel={() => setShowStartTestModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Live "focus" dot for the milestone kicker badge — primary-colored centre
 * with two staggered outward pings synced to the button's twin halo pulse
 * so all four rings breathe together.
 */
function PulseDot() {
  return (
    <span aria-hidden className="relative inline-flex h-1.5 w-1.5">
      <span className="animate-scheduler-pulse absolute inline-flex h-full w-full rounded-full bg-primary" />
      <span className="animate-scheduler-pulse-delayed absolute inline-flex h-full w-full rounded-full bg-primary" />
      <span className="relative inline-flex h-full w-full rounded-full bg-primary" />
    </span>
  );
}
