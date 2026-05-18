"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LessonWithProgress } from "@/lib/queries/lessons";
import { parseAutoLessonId } from "@/lib/queries/auto-lessons";
import { LessonStartTestModal } from "@/components/study";
import { SpecialLessonCard } from "./SpecialLessonCard";
import { cn } from "@/lib/utils";

// One card (260px) + gap (12px) — scroll roughly one card per click.
const SCROLL_STEP = 272;

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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
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

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

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
            "pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background from-20% to-transparent transition-opacity",
            canScrollLeft ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background from-20% to-transparent transition-opacity",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
        />
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-SCROLL_STEP)}
            aria-label="Scroll left"
            className="absolute left-2 top-[calc(50%-6px)] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all hover:text-primary hover:shadow-[0_6px_20px_rgba(0,0,0,0.28)] sm:left-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy(SCROLL_STEP)}
            aria-label="Scroll right"
            className="absolute right-2 top-[calc(50%-6px)] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.22)] transition-all hover:text-primary hover:shadow-[0_6px_20px_rgba(0,0,0,0.28)] sm:right-1"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
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
