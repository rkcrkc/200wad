"use client";

import { useEffect, useRef, useState } from "react";
import { LessonWithProgress } from "@/lib/queries";
import { parseAutoLessonId } from "@/lib/queries/auto-lessons";
import { LessonStartTestModal } from "@/components/study";
import { SpecialLessonCard } from "./SpecialLessonCard";
import { cn } from "@/lib/utils";

interface SpecialLessonsRowProps {
  /** All lessons (real + auto). Auto-lessons are filtered out internally. */
  lessons: LessonWithProgress[];
  /**
   * "lesson" (default): cards link to the lesson detail page.
   * "test": cards open the LessonStartTestModal so the user can launch the
   *   test for that auto-lesson directly.
   */
  mode?: "lesson" | "test";
}

// Display order in the row, left to right.
const DISPLAY_ORDER = ["lost_mastery", "unmastered", "worst", "notes", "best"] as const;

export function SpecialLessonsRow({ lessons, mode = "lesson" }: SpecialLessonsRowProps) {
  // Index auto-lessons by type for ordered lookup.
  const byType = new Map<string, LessonWithProgress>();
  for (const l of lessons) {
    if (!l.isAutoLesson) continue;
    const parsed = parseAutoLessonId(l.id);
    if (parsed) byType.set(parsed.type, l);
  }

  const [testLesson, setTestLesson] = useState<LessonWithProgress | null>(null);

  // Build cards in DISPLAY_ORDER, dropping Lost Mastery when its count is 0.
  const cards = DISPLAY_ORDER.flatMap((type) => {
    const lesson = byType.get(type);
    if (!lesson) return [];
    const count = lesson.word_count ?? 0;
    if (type === "lost_mastery" && count === 0) return [];

    const cardProps =
      mode === "test"
        ? {
            // Empty auto-lessons can't run a test — leave the click a no-op.
            onClick: count > 0 ? () => setTestLesson(lesson) : undefined,
          }
        : { href: `/lesson/${lesson.id}` };

    return [
      <SpecialLessonCard
        key={type}
        emoji={lesson.emoji || "📚"}
        title={lesson.title}
        count={count}
        hoverLabel={mode === "test" ? "Start test" : "View"}
        {...cardProps}
      />,
    ];
  });

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [cards.length]);

  if (cards.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={scrollerRef}
          className="flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {cards}
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent transition-opacity",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      {testLesson && (
        <LessonStartTestModal
          lessonId={testLesson.id}
          lessonTitle={testLesson.title}
          wordCount={testLesson.word_count ?? 0}
          onCancel={() => setTestLesson(null)}
        />
      )}
    </section>
  );
}
