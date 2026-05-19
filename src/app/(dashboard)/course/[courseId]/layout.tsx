import { notFound } from "next/navigation";
import { after } from "next/server";
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
 *     course on the next request. Skipped if already current; otherwise runs
 *     via `after()` so the write happens after the response is sent and never
 *     blocks rendering.
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

  // Fetch identity + stats + persisted current_course_id in parallel. The
  // persisted-id lookup lets us skip a redundant write below when the user is
  // already on this course. Stats calls already short-circuit for guests
  // internally.
  const [{ course, language }, courseProgress, dueTestsCount, persistedCourseRow] = await Promise.all([
    getCourseById(courseId),
    isGuest ? Promise.resolve(null) : getCourseProgress(courseId),
    isGuest ? Promise.resolve(0) : getDueTestsCount(courseId),
    isGuest || !user
      ? Promise.resolve(null)
      : supabase
          .from("users")
          .select("current_course_id")
          .eq("id", user.id)
          .single()
          .then((r) => r.data),
  ]);

  if (!course) {
    notFound();
  }

  // Persist this as the user's current course only if it actually changed.
  // Runs after the response so the write never blocks rendering. The persisted
  // id is only consumed by the parent dashboard layout's getCurrentCourse()
  // for routes that don't have a courseId in the URL, so a tiny delay before
  // it propagates is harmless.
  if (!isGuest && persistedCourseRow?.current_course_id !== courseId) {
    after(async () => {
      const result = await setCurrentCourse(courseId);
      if (!result.success) {
        console.error("Failed to persist current course:", result.error);
      }
    });
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
