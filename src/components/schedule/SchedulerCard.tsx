"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Eye } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ScrollablePills } from "./ScrollablePills";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import type { LessonForScheduler } from "@/lib/queries";

interface SchedulerCardProps {
  lesson: LessonForScheduler;
  mode: "test" | "lesson";
}

export function SchedulerCard({ lesson, mode }: SchedulerCardProps) {
  const isTest = mode === "test";

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="flex min-h-[420px] flex-col gap-0 md:flex-row md:items-stretch">
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
          {/* Lesson Number & Word Count */}
          <div className="flex items-center justify-between">
            <p className="text-regular-semibold text-muted-foreground">
              Lesson #{lesson.number}
            </p>
            <WordsPreviewTooltip
              lessonId={lesson.id}
              wordCount={lesson.word_count || lesson.sampleWords.length}
              variant="pill"
            />
          </div>

          <div className="flex flex-1 flex-col justify-center">
            {/* Title */}
            <h2 className="mb-4 text-[36px] font-semibold leading-tight text-foreground">
              {lesson.title}
            </h2>

            {/* Word Tags - 3 rows, horizontally scrollable */}
            <ScrollablePills words={lesson.sampleWords} rows={3} />
          </div>

          {/* Action Buttons */}
          <div className="mt-auto flex items-center gap-3 pt-6">
            <Button asChild size="lg" className="flex-1 gap-2">
              <Link
                href={
                  isTest
                    ? `/lesson/${lesson.id}/test${lesson.nextMilestone ? `?milestone=${lesson.nextMilestone}` : ""}`
                    : `/lesson/${lesson.id}/study`
                }
              >
                {isTest ? "Start test" : "Study lesson"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Tooltip label="Preview lesson">
              <Button asChild variant="ghost" size="icon-lg">
                <Link href={`/lesson/${lesson.id}`}>
                  <Eye className="size-5" />
                </Link>
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
