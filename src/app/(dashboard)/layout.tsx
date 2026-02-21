import { DashboardContent } from "@/components/DashboardContent";
import { getDueTestsCount, getCurrentCourse } from "@/lib/queries";
import { getFlagFromCode } from "@/lib/utils/flags";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch current language and course for header display
  const { course, language } = await getCurrentCourse();
  const dueTestsCount = course ? await getDueTestsCount(course.id) : 0;

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

  return (
    <div className="h-screen overflow-hidden bg-white">
      <DashboardContent
        dueTestsCount={dueTestsCount}
        defaultCourseContext={defaultCourseContext}
      >
        {children}
      </DashboardContent>
    </div>
  );
}
