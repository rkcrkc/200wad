"use client";

import { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ChevronRight, Lock } from "lucide-react";
import { getLanguageCoursesAction, type LanguageCourse } from "@/lib/mutations/subscriptions";

interface ExpandableCourseListProps {
  languageId: string;
  /**
   * When true the language is already accessible (active language/all-languages
   * sub) so no lock affordances are shown and rows link straight to the course.
   */
  isUnlocked: boolean;
  /** True when this language is already sitting in the upgrade cart. */
  isInCart: boolean;
  /**
   * Adds this language to the upgrade cart. Provided only when upgrading is
   * currently possible; when omitted, locked rows fall back to linking to the
   * course and the upsell CTA button is hidden.
   */
  onUpgrade?: () => void;
}

/** Inner row content shared by the link and upgrade-button variants. */
function CourseRowInner({
  course,
  freeCount,
  lockedCount,
  locked,
}: {
  course: LanguageCourse;
  freeCount: number;
  lockedCount: number;
  locked: boolean;
}) {
  return (
    <>
      {/* Thumbnail (📘 placeholder until thumbnail_url is populated) */}
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
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
            <Lock className="h-4 w-4 text-amber-700" />
          </div>
        )}
      </div>

      {/* Name */}
      <span className="min-w-0 flex-1 truncate text-regular-semibold text-foreground">
        {course.name}
      </span>

      {/* Counts: free/locked split when locked, else lessons + words */}
      {locked ? (
        <div className="flex shrink-0 items-center gap-1.5 text-small-medium">
          <span className="text-green-600">{freeCount} free</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-amber-700">{lockedCount} locked</span>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-4 text-small-regular text-muted-foreground">
          <span>{course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}</span>
          <span>{course.wordCount} {course.wordCount === 1 ? "word" : "words"}</span>
        </div>
      )}

      {locked ? (
        <Lock className="h-4 w-4 shrink-0 text-amber-600" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );
}

export function ExpandableCourseList({
  languageId,
  isUnlocked,
  isInCart,
  onUpgrade,
}: ExpandableCourseListProps) {
  const [courses, setCourses] = useState<LanguageCourse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCourses() {
      setLoading(true);
      const result = await getLanguageCoursesAction(languageId);
      if (cancelled) return;

      if (result.success) {
        setCourses(result.courses);
      } else {
        setError(result.error || "Failed to load courses");
      }
      setLoading(false);
    }

    fetchCourses();
    return () => { cancelled = true; };
  }, [languageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-white px-6 py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading courses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white px-6 py-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="bg-white px-6 py-4">
        <p className="text-sm text-muted-foreground">No courses available yet.</p>
      </div>
    );
  }

  // Per-course free/locked split (only meaningful while the language is locked).
  const rows = courses.map((course) => {
    const freeCount = Math.min(course.freeLessons, course.totalLessons);
    const lockedCount = Math.max(0, course.totalLessons - course.freeLessons);
    return { course, freeCount, lockedCount };
  });

  const totalLessons = rows.reduce((sum, r) => sum + r.course.totalLessons, 0);
  const totalFree = rows.reduce((sum, r) => sum + r.freeCount, 0);
  const totalLocked = totalLessons - totalFree;
  const showLocks = !isUnlocked && totalLocked > 0;

  return (
    <div className="bg-white">
      {/* Aggregate upsell strip */}
      {showLocks && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-6 py-3">
          <p className="flex items-center gap-1.5 text-small-medium text-amber-900">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            You can access {totalFree} of {totalLessons} lessons in this language
          </p>
          {onUpgrade &&
            (isInCart ? (
              <span className="shrink-0 text-small-medium text-amber-700">In cart</span>
            ) : (
              <button
                onClick={onUpgrade}
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Upgrade plan
              </button>
            ))}
        </div>
      )}

      {rows.map(({ course, freeCount, lockedCount }, i) => {
        const locked = showLocks && lockedCount > 0;
        // Locked rows open the upgrade flow (when available) instead of deep
        // linking into a course the user can't fully access.
        const asUpgradeButton = locked && !!onUpgrade;

        return (
          <Fragment key={course.id}>
            {/* Divider inset to align with the row's horizontal padding */}
            {i > 0 && <div className="mx-6 border-t border-bone-hover" />}
            {asUpgradeButton ? (
              <button
                type="button"
                onClick={onUpgrade}
                className="flex w-full items-center gap-3 bg-amber-50/40 px-6 py-3 text-left transition-colors hover:bg-amber-50"
              >
                <CourseRowInner
                  course={course}
                  freeCount={freeCount}
                  lockedCount={lockedCount}
                  locked={locked}
                />
              </button>
            ) : (
              <Link
                href={`/course/${course.id}/schedule`}
                prefetch
                className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                  locked ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-bone-hover"
                }`}
              >
                <CourseRowInner
                  course={course}
                  freeCount={freeCount}
                  lockedCount={lockedCount}
                  locked={locked}
                />
              </Link>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
