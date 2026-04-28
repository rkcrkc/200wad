import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/queries/courses";
import { getCourseProgress, getDueTestsCount } from "@/lib/queries";
import { setCurrentCourse } from "@/lib/mutations";
import { SetCourseContext } from "@/components/SetCourseContext";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/server";

interface CourseLayoutProps {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}

/**
 * Course-scoped layout. Owns three responsibilities for any /course/[courseId]/* route:
 *  1. Persist users.current_course_id so getCurrentCourse() returns the right
 *     course on the next request. Awaited (not fire-and-forget) so the write
 *     actually commits.
 *  2. Fetch course-scoped header stats (mastered/total/percent + due tests)
 *     against the URL courseId, not against the persisted current_course_id.
 *     The parent (dashboard) layout's headerStats are based on the persisted
 *     id and can be stale on navigation; values pushed into CourseContext here
 *     override them once the client hydrates.
 *  3. Push course/language identity into CourseContext so child pages don't
 *     each have to wrap themselves in <SetCourseContext>.
 */
export default async function CourseLayout({ children, params }: CourseLayoutProps) {
  const { courseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user;

  // Fetch identity + stats in parallel. Stats calls already short-circuit for
  // guests internally.
  const [{ course, language }, courseProgress, dueTestsCount] = await Promise.all([
    getCourseById(courseId),
    isGuest ? Promise.resolve(null) : getCourseProgress(courseId),
    isGuest ? Promise.resolve(0) : getDueTestsCount(courseId),
  ]);

  if (!course) {
    notFound();
  }

  // Persist this as the user's current course. Awaited so subsequent layout
  // renders see fresh data; failures just log and continue (the stats above
  // were fetched against the URL courseId regardless).
  if (!isGuest) {
    await setCurrentCourse(courseId);
  }

  const languageFlag = getFlagFromCode(language?.code);

  return (
    <SetCourseContext
      languageId={language?.id}
      languageFlag={languageFlag}
      languageName={language?.name}
      courseId={course.id}
      courseName={course.name}
      dueTestsCount={dueTestsCount}
      wordsMastered={courseProgress?.wordsMastered}
      totalWords={courseProgress?.totalWords}
      courseProgressPercent={courseProgress?.progressPercent}
    >
      {children}
    </SetCourseContext>
  );
}
