import { notFound } from "next/navigation";
import { getScheduleData } from "@/lib/queries/schedule";
import { getCourseById } from "@/lib/queries/courses";
import { SetCourseContext } from "@/components/SetCourseContext";
import { SchedulerSection, LessonGridSection } from "@/components/schedule";
import { GuestCTA } from "@/components/GuestCTA";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/PageContainer";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/server";

interface SchedulePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseSchedulePage({ params }: SchedulePageProps) {
  const { courseId } = await params;

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
      .select("name")
      .eq("id", user.id)
      .single();
    userName = userData?.name || null;
  }

  // Get schedule data for this specific course
  const scheduleData = await getScheduleData(courseId);

  if (scheduleData.error) {
    return (
      <PageContainer size="sm">
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

  // Generate greeting based on language and time
  const greeting = getGreeting(language?.name || "your language", userName);

  // Check if we have any content to show
  const hasContent =
    dueTests.length > 0 ||
    nextLesson ||
    newLessons.length > 0 ||
    recentLessons.length > 0;

  // Exclude the lesson shown in the scheduler from the grid (avoid duplicate)
  const schedulerLessonId = dueTests[0]?.id ?? nextLesson?.id;
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
      <PageContainer size="sm">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl">
            <span className="mr-2">☀️</span>
            {greeting}
          </h1>
        </div>

        {hasContent ? (
          <>
            {/* Scheduler Section - shows test or next lesson */}
            <SchedulerSection
              dueTests={dueTests}
              nextLesson={nextLesson}
              isFirstLesson={isFirstLesson}
              dueTestsCount={dueTestsCount}
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

        {/* Guest CTA */}
        {isGuest && hasContent && (
          <div className="mt-8">
            <GuestCTA description="Sign up to save your learning progress and access it from any device." />
          </div>
        )}
      </PageContainer>
    </SetCourseContext>
  );
}

/**
 * Generate a greeting based on language and time of day
 */
function getGreeting(languageName: string, userName: string | null): string {
  const hour = new Date().getHours();
  const name = userName || "there";

  // Language-specific greetings
  const greetings: Record<string, { morning: string; afternoon: string; evening: string }> = {
    Italian: {
      morning: "Buongiorno",
      afternoon: "Buon pomeriggio",
      evening: "Buonasera",
    },
    Spanish: {
      morning: "Buenos días",
      afternoon: "Buenas tardes",
      evening: "Buenas noches",
    },
    French: {
      morning: "Bonjour",
      afternoon: "Bon après-midi",
      evening: "Bonsoir",
    },
    German: {
      morning: "Guten Morgen",
      afternoon: "Guten Tag",
      evening: "Guten Abend",
    },
    Portuguese: {
      morning: "Bom dia",
      afternoon: "Boa tarde",
      evening: "Boa noite",
    },
    Japanese: {
      morning: "おはよう",
      afternoon: "こんにちは",
      evening: "こんばんは",
    },
  };

  const langGreetings = greetings[languageName];
  let greeting: string;

  if (langGreetings) {
    if (hour < 12) {
      greeting = langGreetings.morning;
    } else if (hour < 18) {
      greeting = langGreetings.afternoon;
    } else {
      greeting = langGreetings.evening;
    }
  } else {
    // Default English greetings
    if (hour < 12) {
      greeting = "Good morning";
    } else if (hour < 18) {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }
  }

  return `${greeting}, ${name}`;
}
