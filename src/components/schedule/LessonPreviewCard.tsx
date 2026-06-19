"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ClipboardPen, Eye } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StatusPill } from "@/components/ui/status-pill";
import { XpBadge } from "@/components/ui/xp-badge";
import { ScrollablePills } from "./ScrollablePills";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import { LessonStartTestModal } from "@/components/study";
import type { LessonForScheduler } from "@/lib/queries/schedule";
import { useText } from "@/context/TextContext";
import { mapStatus } from "@/lib/utils/helpers";

interface LessonPreviewCardProps {
  lesson: LessonForScheduler;
}

export function LessonPreviewCard({ lesson }: LessonPreviewCardProps) {
  const { t } = useText();
  const statusType = mapStatus(lesson.status || "");
  // XP available — `word_count × 3` (single-direction perfect test).
  const xpAvailable = (lesson.word_count || lesson.sampleWords.length) * 3;
  const [showStartTestModal, setShowStartTestModal] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden pt-2 px-6 rounded-2xl bg-white shadow-card transition-shadow duration-300 hover:shadow-[0px_12px_32px_-8px_rgba(0,0,0,0.18)]">
      <Link href={`/lesson/${lesson.id}`}>
        {/* Lesson Image */}
        <div className="relative h-[220px] w-full overflow-hidden">
          {lesson.imageUrl ? (
            <img
              src={lesson.imageUrl}
              alt={lesson.title}
              className="h-full w-full object-contain pt-4"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-8 w-8 text-gray-300" />
            </div>
          )}
        </div>
      </Link>

      {/* Lesson Info */}
      <div className="flex min-w-0 flex-col pt-8 pb-0">
        {/* Lesson Number & Word Count */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-regular-semibold text-muted-foreground">
            Lesson #{lesson.number}
          </p>
          <div className="flex items-center gap-2">
            <WordsPreviewTooltip
              lessonId={lesson.id}
              wordCount={lesson.word_count || lesson.sampleWords.length}
              variant="pill"
            />
            <StatusPill status={statusType} />
          </div>
        </div>

        {/* Title */}
        <Link href={`/lesson/${lesson.id}`}>
          <h3 className="mb-5 truncate text-xl-semibold text-foreground">
            {lesson.title}
          </h3>
        </Link>

        {/* Word Tags - 2 rows, horizontally scrollable */}
        <ScrollablePills words={lesson.sampleWords} rows={2} />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-8 pb-6">
        <PrimaryButton
          className="flex-1"
          href={`/lesson/${lesson.id}/study`}
        >
          <span className="inline-flex items-center gap-2">
            Study lesson
            <XpBadge value={xpAvailable} variant="on-primary" />
          </span>
        </PrimaryButton>

        <div className="flex items-center">
          <Tooltip label={t("tip_take_test")}>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => setShowStartTestModal(true)}
            >
              <ClipboardPen className="size-5" />
            </Button>
          </Tooltip>

          <Tooltip label={t("tip_preview_lesson")}>
            <Button asChild variant="ghost" size="icon-lg">
              <Link href={`/lesson/${lesson.id}`}>
                <Eye className="size-5" />
              </Link>
            </Button>
          </Tooltip>
        </div>
      </div>

      {showStartTestModal && (
        <LessonStartTestModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          wordCount={lesson.word_count ?? lesson.sampleWords.length}
          onCancel={() => setShowStartTestModal(false)}
        />
      )}
    </div>
  );
}
