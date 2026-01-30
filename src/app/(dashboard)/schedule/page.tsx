import { redirect } from "next/navigation";
import { getScheduleData, getCurrentCourse } from "@/lib/queries";
import { SetCourseContext } from "@/components/SetCourseContext";
import { SchedulerSection, LessonGridSection } from "@/components/schedule";
import { GuestCTA } from "@/components/GuestCTA";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SchedulePage() {
  // Get the user's current course
  const { course, language, userName } = await getCurrentCourse();

  // If no course available, redirect to dashboard to select one
  if (!course) {
    redirect("/dashboard");
  }

  // Get schedule data for the current course
  const scheduleData = await getScheduleData(course.id);

  if (scheduleData.error) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          title="Error loading schedule"
          description={scheduleData.error}
        />
      </div>
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

  return (
    <SetCourseContext
      languageId={language?.id}
      languageFlag={language?.flag}
      languageName={language?.name}
      courseId={course.id}
      courseName={course.name}
      dueTestsCount={dueTestsCount}
    >
      <div className="mx-auto max-w-5xl">
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
              newLessons={newLessons}
              recentLessons={recentLessons}
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
      </div>
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
