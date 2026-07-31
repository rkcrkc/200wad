import { notFound } from "next/navigation";
import { getScheduleData } from "@/lib/queries/schedule";
import { getCourseById } from "@/lib/queries/courses";
import { getLanguagesWithCourses } from "@/lib/queries/onboarding";
import { enrollLanguageAndSetCurrent } from "@/lib/mutations";
import { SchedulerSection, LessonGridSection } from "@/components/schedule";
import { OnboardingSignupGate } from "@/components/auth/OnboardingSignupGate";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/PageContainer";
import { PageShell } from "@/components/PageShell";
import { getTimeOfDay } from "@/lib/greeting";
import { createClient } from "@/lib/supabase/server";
import type { LanguageGreetings } from "@/types/database";

interface SchedulePageProps {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ completed?: string }>;
}

export default async function CourseSchedulePage({ params, searchParams }: SchedulePageProps) {
  const { courseId } = await params;
  const { completed } = await searchParams;

  // Track what user just completed for alternating test/lesson logic
  const justCompletedTest = completed === "test";
  const justCompletedLesson = completed === "lesson";

  // Get course and language info
  const { course, language } = await getCourseById(courseId);

  if (!course) {
    notFound();
  }

  // Get user name for greeting
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName: string | null = null;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("name, current_language_id")
      .eq("id", user.id)
      .single();
    userName = userData?.name || null;

    // For new users (no language set), set up their first language/course.
    // (Existing users' current_course_id is updated by the course-scoped layout
    // at (dashboard)/course/[courseId]/layout.tsx.)
    if (!userData?.current_language_id && language?.id) {
      // Render-safe: no revalidatePath (which throws during render).
      await enrollLanguageAndSetCurrent(language.id, courseId);
    }
  }

  // Get schedule data for this specific course
  const scheduleData = await getScheduleData(courseId);

  if (scheduleData.error) {
    return (
      <PageContainer size="ms">
        <EmptyState
          title="Error loading schedule"
          description={scheduleData.error}
        />
      </PageContainer>
    );
  }

  const {
    dueTests,
    nextLesson,
    worstWordsAutoLesson,
    isFirstLesson,
    dueTestsCount,
    totalLessons,
    newLessons,
    recentLessons,
    needsReviewLessons,
    isGuest,
  } = scheduleData;

  // Fetch languages for onboarding modal (only for guests)
  const languages = isGuest ? await getLanguagesWithCourses() : [];

  // Greeting: pass raw per-language greetings + name to the client, which picks
  // morning/afternoon/evening from the browser clock. The server-computed
  // timeOfDay is only the pre-hydration default.
  const greetings = (language?.greetings as LanguageGreetings | null) ?? null;
  const initialTimeOfDay = getTimeOfDay();

  // Check if we have any content to show
  const hasContent =
    dueTests.length > 0 ||
    nextLesson ||
    worstWordsAutoLesson ||
    newLessons.length > 0 ||
    recentLessons.length > 0 ||
    needsReviewLessons.length > 0;

  // Determine which lesson is shown in the scheduler (same alternating logic as SchedulerSection).
  // Priority:
  //   1. Just-completed test → next lesson (variety after a test)
  //   2. Just-completed lesson → next due test (alternating tests/lessons)
  //   3. Worst Words auto-lesson when due (≥7 days since last) — top weekly priority
  //   4. Default: due test if any, else next lesson
  let schedulerLessonId: string | undefined;
  if (justCompletedTest && nextLesson) {
    schedulerLessonId = nextLesson.id;
  } else if (justCompletedLesson && dueTests.length > 0) {
    schedulerLessonId = dueTests[0].id;
  } else if (worstWordsAutoLesson) {
    schedulerLessonId = worstWordsAutoLesson.id;
  } else {
    schedulerLessonId = dueTests[0]?.id ?? nextLesson?.id;
  }
  const filteredNewLessons = schedulerLessonId
    ? newLessons.filter((l) => l.id !== schedulerLessonId)
    : newLessons;
  const filteredRecentLessons = schedulerLessonId
    ? recentLessons.filter((l) => l.id !== schedulerLessonId)
    : recentLessons;
  const filteredNeedsReviewLessons = schedulerLessonId
    ? needsReviewLessons.filter((l) => l.id !== schedulerLessonId)
    : needsReviewLessons;

  return (
    <PageShell greetings={greetings} greetingUserName={userName} initialTimeOfDay={initialTimeOfDay} withTopPadding={false} className="pt-12 pb-20">
        {hasContent ? (
          <>
            {/* Scheduler Section - shows test or next lesson */}
            <SchedulerSection
              dueTests={dueTests}
              nextLesson={nextLesson}
              worstWordsAutoLesson={worstWordsAutoLesson}
              isFirstLesson={isFirstLesson}
              dueTestsCount={dueTestsCount}
              totalLessons={totalLessons}
              justCompletedTest={justCompletedTest}
              justCompletedLesson={justCompletedLesson}
            />

            {/* Lesson Grid Section */}
            <LessonGridSection
              newLessons={filteredNewLessons}
              recentLessons={filteredRecentLessons}
              needsReviewLessons={filteredNeedsReviewLessons}
              hasDueTests={dueTests.length > 0}
              courseId={course.id}
              totalLessons={totalLessons}
            />
          </>
        ) : (
          <EmptyState
            title="No lessons available yet"
            description="Lessons will appear here once they're added to this course."
          />
        )}

        {/* Onboarding modal for guests */}
        <OnboardingSignupGate
          courseId={course.id}
          isGuest={isGuest}
          languages={languages}
        />
    </PageShell>
  );
}
