import { notFound } from "next/navigation";
import { getScheduleData } from "@/lib/queries/schedule";
import { getCourseById } from "@/lib/queries/courses";
import { getLanguagesWithCourses } from "@/lib/queries/onboarding";
import { setCurrentCourse, addLanguageWithCourse } from "@/lib/mutations";
import { SetCourseContext } from "@/components/SetCourseContext";
import { SchedulerSection, LessonGridSection } from "@/components/schedule";
import { OnboardingSignupGate } from "@/components/auth/OnboardingSignupGate";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/PageContainer";
import { PageShell } from "@/components/PageShell";
import { getFlagFromCode } from "@/lib/utils/flags";
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

    // For new users (no language set), set up their first language/course
    if (!userData?.current_language_id && language?.id) {
      // This is a new user - persist their language and course selection
      await addLanguageWithCourse(language.id);
    } else {
      // Existing user - just update the current course (fire-and-forget)
      setCurrentCourse(courseId);
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
    isFirstLesson,
    dueTestsCount,
    newLessons,
    recentLessons,
    isGuest,
  } = scheduleData;

  // Fetch languages for onboarding modal (only for guests)
  const languages = isGuest ? await getLanguagesWithCourses() : [];

  // Generate greeting based on language and time
  const { greeting, translation } = getGreeting(
    language?.greetings as LanguageGreetings | null,
    userName
  );

  // Check if we have any content to show
  const hasContent =
    dueTests.length > 0 ||
    nextLesson ||
    newLessons.length > 0 ||
    recentLessons.length > 0;

  // Determine which lesson is shown in the scheduler (same alternating logic as SchedulerSection)
  let schedulerLessonId: string | undefined;
  if (justCompletedTest && nextLesson) {
    // Just finished a test - scheduler shows next lesson
    schedulerLessonId = nextLesson.id;
  } else if (justCompletedLesson && dueTests.length > 0) {
    // Just finished a lesson - scheduler shows due test
    schedulerLessonId = dueTests[0].id;
  } else {
    // Default: test if due, otherwise lesson
    schedulerLessonId = dueTests[0]?.id ?? nextLesson?.id;
  }
  const filteredNewLessons = schedulerLessonId
    ? newLessons.filter((l) => l.id !== schedulerLessonId)
    : newLessons;
  const filteredRecentLessons = schedulerLessonId
    ? recentLessons.filter((l) => l.id !== schedulerLessonId)
    : recentLessons;

  const languageFlag = getFlagFromCode(language?.code);

  return (
    <SetCourseContext
      languageId={language?.id}
      languageFlag={languageFlag}
      languageName={language?.name}
      courseId={course.id}
      courseName={course.name}
      dueTestsCount={dueTestsCount}
    >
      <PageShell greeting={greeting} greetingTranslation={translation} withTopPadding={false} className="pt-8 pb-24">
        {hasContent ? (
          <>
            {/* Scheduler Section - shows test or next lesson */}
            <SchedulerSection
              dueTests={dueTests}
              nextLesson={nextLesson}
              isFirstLesson={isFirstLesson}
              dueTestsCount={dueTestsCount}
              justCompletedTest={justCompletedTest}
              justCompletedLesson={justCompletedLesson}
            />

            {/* Lesson Grid Section */}
            <LessonGridSection
              newLessons={filteredNewLessons}
              recentLessons={filteredRecentLessons}
              hasDueTests={dueTests.length > 0}
              courseId={course.id}
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
    </SetCourseContext>
  );
}

/**
 * Generate a greeting based on language greetings from DB and time of day.
 * Returns both the foreign-language greeting and its English translation.
 */
function getGreeting(
  greetings: LanguageGreetings | null,
  userName: string | null
): { greeting: string; translation: string | undefined } {
  const hour = new Date().getHours();
  const name = userName || "there";
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  if (greetings?.[timeOfDay]) {
    const entry = greetings[timeOfDay];
    return {
      greeting: `${entry.text}, ${name}`,
      translation: entry.translation ? `${entry.translation}, ${name}` : undefined,
    };
  }

  // Fallback: English only (no translation needed)
  const english: Record<string, string> = {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
  };

  return {
    greeting: `${english[timeOfDay]}, ${name}`,
    translation: undefined,
  };
}
