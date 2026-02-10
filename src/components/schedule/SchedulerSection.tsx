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
  /** True if user just completed a test and there are more due */
  justCompletedTest?: boolean;
}

export function SchedulerSection({
  dueTests,
  nextLesson,
  isFirstLesson,
  dueTestsCount,
  justCompletedTest = false,
}: SchedulerSectionProps) {
  // Determine what to show and the heading
  const hasDueTests = dueTests.length > 0;
  const hasMultipleTests = dueTestsCount > 1;

  // Get the primary item to display
  const primaryTest = dueTests[0];
  const displayLesson = hasDueTests ? primaryTest : nextLesson;

  if (!displayLesson) {
    return null;
  }

  // Determine heading text based on state
  let heading: string;
  let linkText: string;
  let linkHref: string;

  if (hasDueTests) {
    // Test mode - show "another test" if user just completed one or has multiple
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
    <section className="mb-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{heading}</h2>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={linkHref}>
            {linkText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Scheduler Card */}
      <SchedulerCard
        lesson={displayLesson}
        mode={hasDueTests ? "test" : "lesson"}
      />
    </section>
  );
}
