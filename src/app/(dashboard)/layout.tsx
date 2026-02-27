import { DashboardContent } from "@/components/DashboardContent";
import {
  getDueTestsCount,
  getCurrentCourse,
  getUserLearningStats,
  getCourseProgress,
} from "@/lib/queries";
import { getFlagFromCode } from "@/lib/utils/flags";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch current language and course for header display
  const { course, language } = await getCurrentCourse();

  // Fetch stats in parallel
  const [dueTestsCount, learningStats, courseProgress] = await Promise.all([
    course ? getDueTestsCount(course.id) : Promise.resolve(0),
    getUserLearningStats(),
    course ? getCourseProgress(course.id) : Promise.resolve(null),
  ]);

  // Prepare default course context for header
  const defaultCourseContext = course && language
    ? {
        languageId: language.id,
        languageFlag: getFlagFromCode(language.code),
        languageName: language.name,
        courseId: course.id,
        courseName: course.name,
      }
    : undefined;

  // Prepare header stats
  const headerStats = {
    wordsPerDay: learningStats.wordsPerDay,
    courseProgressPercent: courseProgress?.progressPercent ?? 0,
  };

  return (
    <div className="h-screen overflow-hidden bg-white">
      <DashboardContent
        dueTestsCount={dueTestsCount}
        defaultCourseContext={defaultCourseContext}
        headerStats={headerStats}
      >
        {children}
      </DashboardContent>
    </div>
  );
}
