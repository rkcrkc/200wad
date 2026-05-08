"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchedulerCard } from "./SchedulerCard";
import type { LessonForScheduler } from "@/lib/queries";

/** Above this count, tabs switch to compact (numbers only) + scroll. */
const COMPACT_TABS_THRESHOLD = 4;

interface SchedulerSectionProps {
  dueTests: LessonForScheduler[];
  nextLesson: LessonForScheduler | null;
  /**
   * Worst Words auto-lesson, surfaced once per week. When set (and the user
   * hasn't just completed a test/lesson), it takes top priority over
   * dueTests / nextLesson in the scheduler card.
   */
  worstWordsAutoLesson?: LessonForScheduler | null;
  isFirstLesson: boolean;
  dueTestsCount: number;
  totalLessons: number;
  /** True if user just completed a test */
  justCompletedTest?: boolean;
  /** True if user just completed a lesson */
  justCompletedLesson?: boolean;
}

export function SchedulerSection({
  dueTests,
  nextLesson,
  worstWordsAutoLesson = null,
  isFirstLesson,
  dueTestsCount,
  totalLessons,
  justCompletedTest = false,
  justCompletedLesson = false,
}: SchedulerSectionProps) {
  const hasDueTests = dueTests.length > 0;
  const hasMultipleTests = dueTests.length > 1;

  // Active test index — only meaningful when in test mode with multiple tests.
  const [activeTestIndex, setActiveTestIndex] = useState(0);

  // If the dueTests array shrinks (e.g. user completes a test), clamp the index.
  useEffect(() => {
    if (activeTestIndex >= dueTests.length) {
      setActiveTestIndex(0);
    }
  }, [dueTests.length, activeTestIndex]);

  const primaryTest = dueTests[activeTestIndex] ?? dueTests[0];

  // Alternating / priority logic:
  // - After completing a test → show next lesson (even if more tests are due)
  // - After completing a lesson → show due test (if any)
  // - Otherwise, when Worst Words is due (≥7 days since last) → it wins
  // - Otherwise → show test if due, else next lesson
  let showTest: boolean;
  let displayLesson: LessonForScheduler | null;
  let showWorstWords = false;

  if (justCompletedTest && nextLesson) {
    // Just finished a test - show next lesson for variety
    showTest = false;
    displayLesson = nextLesson;
  } else if (justCompletedLesson && hasDueTests) {
    // Just finished a lesson - show due test
    showTest = true;
    displayLesson = primaryTest;
  } else if (worstWordsAutoLesson) {
    // Weekly Worst Words slot — always wins outside the just-completed paths
    showTest = false;
    showWorstWords = true;
    displayLesson = worstWordsAutoLesson;
  } else {
    // Default: show test if due, otherwise lesson
    showTest = hasDueTests;
    displayLesson = hasDueTests ? primaryTest : nextLesson;
  }

  if (!displayLesson) {
    return null;
  }

  // Determine heading text based on state
  let heading: string;
  let linkText: string;
  let linkHref: string;
  let linkCount: number;

  if (showTest) {
    if (hasMultipleTests) {
      heading = `You have ${dueTestsCount} tests due`;
    } else {
      heading = "You have a test due";
    }
    linkText = "All tests due";
    linkHref = "/tests";
    linkCount = dueTestsCount;
  } else if (showWorstWords) {
    heading = "It's time for your weekly review";
    linkText = "All lessons";
    linkHref = displayLesson
      ? `/course/${displayLesson.course_id}`
      : "/dashboard";
    linkCount = totalLessons;
  } else if (isFirstLesson) {
    heading = "It's time for your first lesson";
    linkText = "All lessons";
    linkHref = nextLesson ? `/course/${nextLesson.course_id}` : "/dashboard";
    linkCount = totalLessons;
  } else {
    heading = "It's time for your next lesson";
    linkText = "All lessons";
    linkHref = nextLesson ? `/course/${nextLesson.course_id}` : "/dashboard";
    linkCount = totalLessons;
  }

  // Show dot pagination only when displaying tests and there are multiple.
  const showTestDots = showTest && hasMultipleTests;
  const isCompactTabs = dueTests.length > COMPACT_TABS_THRESHOLD;

  // Horizontal scroll state for the tab strip (used in compact mode).
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    if (!showTestDots) return;
    const el = tabsScrollRef.current;
    if (!el) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollState, showTestDots, dueTests.length]);

  // Auto-scroll the active tab into view when it changes (e.g. after the
  // dueTests array shrinks and useEffect clamps the index back to 0).
  useEffect(() => {
    if (!isCompactTabs) return;
    const container = tabsScrollRef.current;
    if (!container) return;
    const btn = container.querySelector<HTMLButtonElement>(
      `[data-tab-index="${activeTestIndex}"]`
    );
    if (!btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    if (bRect.left < cRect.left || bRect.right > cRect.right) {
      container.scrollTo({
        left:
          btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2,
        behavior: "smooth",
      });
    }
  }, [activeTestIndex, isCompactTabs]);

  const scrollByAmount = (delta: number) => {
    tabsScrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="mb-16">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xxl2-semibold text-foreground">{heading}</h2>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={linkHref}>
            {linkText} ({linkCount})
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Test folder tabs — beige wrapper with a white "notch" for the active tab.
          Above COMPACT_TABS_THRESHOLD, tabs collapse to numeric labels with
          horizontal scrolling, edge gradients, and chevron controls.
          relative z-10 keeps tabs above the SchedulerCard's drop shadow. */}
      {showTestDots && (
        <div className="relative z-10 -mb-px w-fit max-w-full">
          <div className="relative w-fit max-w-full overflow-hidden rounded-t-xl bg-beige">
            <div
              ref={tabsScrollRef}
              role="tablist"
              aria-label="Due tests"
              onScroll={updateScrollState}
              className="flex items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {dueTests.map((test, i) => {
                const isActive = i === activeTestIndex;
                return (
                  <button
                    key={test.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Test ${i + 1} of ${dueTests.length}`}
                    data-tab-index={i}
                    onClick={() => setActiveTestIndex(i)}
                    className={`text-small-semibold flex-shrink-0 rounded-t-xl py-3 transition-colors ${
                      isCompactTabs
                        ? "min-w-[44px] px-4"
                        : "px-10"
                    } ${
                      isActive
                        ? "bg-white text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isCompactTabs ? i + 1 : `Test #${i + 1}`}
                  </button>
                );
              })}
            </div>

            {/* Left fade + chevron — only when scrolled away from the start */}
            {isCompactTabs && canScrollLeft && (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 rounded-tl-xl bg-gradient-to-r from-beige via-beige/85 to-transparent" />
                <button
                  type="button"
                  onClick={() => scrollByAmount(-160)}
                  aria-label="Scroll tabs left"
                  className="absolute inset-y-0 left-0 z-20 flex items-center px-2 text-foreground transition-colors hover:text-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Right fade + chevron — only when more tabs lie offscreen */}
            {isCompactTabs && canScrollRight && (
              <>
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 rounded-tr-xl bg-gradient-to-l from-beige via-beige/85 to-transparent" />
                <button
                  type="button"
                  onClick={() => scrollByAmount(160)}
                  aria-label="Scroll tabs right"
                  className="absolute inset-y-0 right-0 z-20 flex items-center px-2 text-foreground transition-colors hover:text-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Scheduler Card */}
      <SchedulerCard
        lesson={displayLesson}
        mode={showTest ? "test" : "lesson"}
        flushTopLeft={showTestDots}
      />
    </section>
  );
}
