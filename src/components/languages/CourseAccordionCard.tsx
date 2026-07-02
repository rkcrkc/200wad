"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ChevronRight, Lock } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ScrollFadeRow } from "@/components/ui/scroll-fade-row";
import { CourseLevelBadge } from "@/components/ui/course-level-badge";
import { Button } from "@/components/ui/button";
import { tabPillVariants } from "@/components/ui/tabs";
import { XpIcon } from "@/components/ui/xp-icon";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/helpers";
import type {
  LanguageCourseRow,
  CourseExpansion,
} from "@/lib/queries/languageCourses.types";

/**
 * A single course rendered as a focal card on the Languages page. The summary
 * row (a clickable link) shows the thumbnail, name, difficulty + lesson count,
 * and progress. Beneath it a strip of lesson tabs lets the user switch which
 * lesson's words appear in the thumbnail strip below. Expansion data is loaded
 * server-side and passed in, so the card paints fully populated immediately.
 */
export function CourseAccordionCard({
  course,
  expansion,
  view = "grid",
}: {
  course: LanguageCourseRow;
  expansion: CourseExpansion;
  /** "grid" = big-thumbnail strip; "list" = compact english/foreign rows. */
  view?: "list" | "grid";
}) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    expansion.lessons[0]?.id ?? null
  );

  const metaParts: string[] = [];
  if (course.description) metaParts.push(course.description);
  if (course.cefr_range) metaParts.push(course.cefr_range);
  const metaText = metaParts.join(" • ");

  const lessonCount = expansion.lessons.length;

  const activeLesson =
    expansion.lessons.find((l) => l.id === activeLessonId) ??
    expansion.lessons[0] ??
    null;

  return (
    <div className="relative">
      {course.isCurrent && (
        <span className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-primary bg-white px-2.5 py-1 text-xs-medium text-primary">
          <Check className="h-3.5 w-3.5" />
          Current course
        </span>
      )}
      <div
        className={cn(
          "overflow-hidden rounded-2xl bg-white shadow-card",
          course.isCurrent && "border border-primary ring-2 ring-primary"
        )}
      >
        {/* Summary row */}
      <div className="flex items-center gap-4 p-6">
        {/* Thumbnail placeholder */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bone text-2xl">
          📘
        </div>

        {/* Name + difficulty + lesson count */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="truncate text-xxl2-semibold">{course.name}</h3>
            <CourseLevelBadge level={course.level} className="shrink-0" />
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {metaText}
          </p>
        </div>

        {/* Progress */}
        <ProgressRing value={course.progressPercent} size={40} showValue />

        {/* Course CTA */}
        <Button asChild className="group shrink-0">
          <a href="#">
            {course.isCurrent ? "Continue studying" : "Study Now"}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </Button>
      </div>

      {/* Detail: lesson tabs + the active lesson's words */}
      <div className="border-t border-bone-hover px-6 py-6">
        {expansion.error ? (
          <p className="py-4 text-center text-sm text-gray-500">
            Couldn&apos;t load this course.
          </p>
        ) : expansion.lessons.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No lessons yet.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Lesson tabs */}
            <ScrollFadeRow role="tablist" className="flex gap-2">
              <span className="flex shrink-0 items-center py-1 pr-2.5 text-sm font-semibold text-muted-foreground">
                {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
              </span>
              {expansion.lessons.map((lesson) => {
                const isActive = lesson.id === activeLesson?.id;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={cn(
                      "flex items-center gap-1",
                      tabPillVariants({
                        variant: "bone",
                        size: "default",
                        active: isActive,
                      })
                    )}
                  >
                    {lesson.emoji && <span>{lesson.emoji}</span>}
                    {lesson.isLocked && <Lock className="h-3 w-3" />}
                    {lesson.title}
                    {lesson.wordCount > 0 && (
                      <>
                        <span aria-hidden="true" className="opacity-50">
                          ·
                        </span>
                        <XpIcon className="size-3 fill-current text-current" />
                        {formatNumber(lesson.wordCount * 3)}
                      </>
                    )}
                  </button>
                );
              })}
            </ScrollFadeRow>

            {/* Active lesson's words */}
            {activeLesson && activeLesson.words.length > 0 ? (
              view === "grid" ? (
                <ScrollFadeRow className="flex gap-4">
                  {activeLesson.words.map((word) => (
                    <div
                      key={word.id}
                      className="w-44 shrink-0"
                      title={`${word.english} — ${word.foreign}`}
                    >
                      <div className="relative h-44 w-44 overflow-hidden rounded-lg bg-bone">
                        {word.imageUrl ? (
                          <Image
                            src={word.imageUrl}
                            alt={word.english}
                            fill
                            className="object-cover"
                            sizes="176px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl">
                            🗣️
                          </div>
                        )}
                        {activeLesson.isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/40 backdrop-blur-xs">
                            <Lock className="h-5 w-5 text-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 truncate text-center text-small-medium text-foreground">
                        {word.english}
                      </p>
                      <p className="truncate text-center text-xs text-muted-foreground">
                        {word.foreign}
                      </p>
                    </div>
                  ))}
                </ScrollFadeRow>
              ) : (
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  {(() => {
                    const mid = Math.ceil(activeLesson.words.length / 2);
                    const columns = [
                      activeLesson.words.slice(0, mid),
                      activeLesson.words.slice(mid),
                    ];
                    return columns.map((col, colIndex) =>
                      col.length === 0 ? null : (
                        <div key={colIndex}>
                          {col.map((word, i) => (
                            <div
                              key={word.id}
                              className={cn(
                                "flex items-center gap-3 py-2.5",
                                i !== 0 && "border-t border-bone-hover"
                              )}
                              title={`${word.english} — ${word.foreign}`}
                            >
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-bone">
                                {word.imageUrl ? (
                                  <Image
                                    src={word.imageUrl}
                                    alt={word.english}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-lg">
                                    🗣️
                                  </div>
                                )}
                                {activeLesson.isLocked && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-xs">
                                    <Lock className="h-4 w-4 text-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-regular-medium text-foreground">
                                  {word.english}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {word.foreign}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    );
                  })()}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                No words in this lesson yet.
              </p>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
