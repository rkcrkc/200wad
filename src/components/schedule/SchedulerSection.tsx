import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchedulerCard } from "./SchedulerCard";
import type { LessonForScheduler } from "@/lib/queries";

interface SchedulerSectionProps {
  dueTests: LessonForScheduler[];
  nextLesson: LessonForScheduler | null;
  isFirstLesson: boolean;
  dueTestsCount: number;
  /** True if user just completed a test */
  justCompletedTest?: boolean;
  /** True if user just completed a lesson */
  justCompletedLesson?: boolean;
}

export function SchedulerSection({
  dueTests,
  nextLesson,
  isFirstLesson,
  dueTestsCount,
  justCompletedTest = false,
  justCompletedLesson = false,
}: SchedulerSectionProps) {
  const hasDueTests = dueTests.length > 0;
  const hasMultipleTests = dueTestsCount > 1;
  const primaryTest = dueTests[0];

  // Alternating logic:
  // - After completing a test → show next lesson (even if more tests are due)
  // - After completing a lesson → show due test (if any)
  // - Otherwise → show test if due, else lesson
  let showTest: boolean;
  let displayLesson: LessonForScheduler | null;

  if (justCompletedTest && nextLesson) {
    // Just finished a test - show next lesson for variety
    showTest = false;
    displayLesson = nextLesson;
  } else if (justCompletedLesson && hasDueTests) {
    // Just finished a lesson - show due test
    showTest = true;
    displayLesson = primaryTest;
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

  if (showTest) {
    // Test mode - show "another test" if user just completed one and has multiple
    if (justCompletedTest && hasMultipleTests) {
      heading = "You have another test due";
    } else {
      heading = "You have a test due";
    }
    linkText = "All tests";
    linkHref = "/tests";
  } else if (isFirstLesson) {
    heading = "It's time for your first lesson";
    linkText = "All lessons";
    linkHref = nextLesson ? `/course/${nextLesson.course_id}` : "/dashboard";
  } else {
    heading = "It's time for your next lesson";
    linkText = "All lessons";
    linkHref = nextLesson ? `/course/${nextLesson.course_id}` : "/dashboard";
  }

  return (
    <section className="mb-16">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xxl2-semibold text-foreground">{heading}</h2>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={linkHref}>
            {linkText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Scheduler Card */}
      <SchedulerCard
        lesson={displayLesson}
        mode={showTest ? "test" : "lesson"}
      />
    </section>
  );
}
