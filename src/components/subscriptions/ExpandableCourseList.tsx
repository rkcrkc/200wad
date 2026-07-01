"use client";

import { Fragment } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";
import type { LanguageCourse } from "@/lib/queries/subscriptions";

interface ExpandableCourseListProps {
  /** Courses for this language, prefetched with the page (no per-expand fetch). */
  courses: LanguageCourse[];
  /**
   * When true the language is already accessible (active language/all-languages
   * sub) so no lock affordances are shown.
   */
  isUnlocked: boolean;
}

/** Inner row content for a course row. */
function CourseRowInner({
  course,
  lockedCount,
  locked,
}: {
  course: LanguageCourse;
  lockedCount: number;
  locked: boolean;
}) {
  return (
    <>
      {/* Thumbnail + name span the Language + Current Plan columns */}
      <div className="col-span-2 flex min-w-0 items-center gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bone text-xl">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt={course.name}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            "📘"
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-regular-medium text-foreground">
          {course.name}
        </span>
      </div>

      {/* Lessons column: free/locked split when locked, else lessons + words */}
      {locked ? (
        <div className="flex items-center gap-2 text-small-regular text-muted-foreground">
          <span>{course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-small-medium text-warning">
            <Lock className="h-3 w-3 shrink-0" />
            {lockedCount} locked
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 text-small-regular text-muted-foreground">
          <span>{course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}</span>
          <span>{course.wordCount} {course.wordCount === 1 ? "word" : "words"}</span>
        </div>
      )}

      {/* Action + chevron columns (reserved, keeps the Lessons column aligned) */}
      <span />
      <span />
    </>
  );
}

export function ExpandableCourseList({
  courses,
  isUnlocked,
}: ExpandableCourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="bg-white px-8 py-4">
        <p className="text-sm text-muted-foreground">No courses available yet.</p>
      </div>
    );
  }

  // Per-course locked count (only meaningful while the language is locked).
  const rows = courses.map((course) => {
    const lockedCount = Math.max(0, course.totalLessons - course.freeLessons);
    return { course, lockedCount };
  });

  const totalLocked = rows.reduce((sum, r) => sum + r.lockedCount, 0);
  const showLocks = !isUnlocked && totalLocked > 0;

  return (
    <div className="bg-white">
      {rows.map(({ course, lockedCount }, i) => {
        const locked = showLocks && lockedCount > 0;

        return (
          <Fragment key={course.id}>
            {/* Divider inset to align with the row's horizontal padding */}
            {i > 0 && <div className="mx-8 border-t border-bone-hover" />}
            <div className="grid grid-cols-[minmax(0,240px)_minmax(0,180px)_1fr_220px_40px] items-center px-8 py-3">
              <CourseRowInner
                course={course}
                lockedCount={lockedCount}
                locked={locked}
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
