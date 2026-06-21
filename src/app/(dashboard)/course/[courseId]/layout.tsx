import { notFound } from "next/navigation";
import { after } from "next/server";
import { getCourseById } from "@/lib/queries/courses";
import { getCourseProgress, getDueTestsCount, getUserLearningStats } from "@/lib/queries";
import { SetCourseContext } from "@/components/SetCourseContext";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const [
    { course, language },
    courseProgress,
    dueTestsCount,
    courseLearningStats,
    allCourseLearningStats,
    persistedCourseRow,
  ] = await Promise.all([
    getCourseById(courseId),
    isGuest ? Promise.resolve(null) : getCourseProgress(courseId),
    isGuest ? Promise.resolve(0) : getDueTestsCount(courseId),
    isGuest ? Promise.resolve(null) : getUserLearningStats(courseId),
    isGuest ? Promise.resolve(null) : getUserLearningStats(),
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
  //
  // Use the admin client + captured userId here: `cookies()` (and therefore
  // the cookie-backed server client) cannot be called inside `after()` in
  // Next.js 16.
  const courseChanged = persistedCourseRow?.current_course_id !== courseId;
  if (!isGuest && user && (courseChanged || language?.id)) {
    const userId = user.id;
    const languageId = language?.id;
    after(async () => {
      try {
        const admin = createAdminClient();

        if (courseChanged) {
          const { error } = await admin
            .from("users")
            .update({ current_course_id: courseId })
            .eq("id", userId);
          if (error) {
            console.error("Failed to persist current course:", error.message);
          }
        }

        // Enroll the language into user_languages if it isn't already, so that
        // "My Languages" and the Profile "Learning Languages" set stay in sync
        // whenever a user starts a course in a language they reached directly.
        if (languageId) {
          const { data: existingLang } = await admin
            .from("user_languages")
            .select("id")
            .eq("user_id", userId)
            .eq("language_id", languageId)
            .maybeSingle();
          if (!existingLang) {
            const { error: enrollError } = await admin
              .from("user_languages")
              .insert({ user_id: userId, language_id: languageId, is_current: false });
            if (enrollError) {
              console.error("Failed to enroll language:", enrollError.message);
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to persist current course:", message);
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
      wordsPerDay={courseLearningStats?.wordsPerDay}
      totalWordsLearned={courseLearningStats?.totalWordsLearned}
      studyTimeSeconds={courseLearningStats?.studyTimeSeconds}
      testTimeSeconds={courseLearningStats?.testTimeSeconds}
      totalTimeSeconds={courseLearningStats?.totalTimeSeconds}
      allCourseStudyTimeSeconds={allCourseLearningStats?.studyTimeSeconds}
      allCourseTestTimeSeconds={allCourseLearningStats?.testTimeSeconds}
      allCourseTotalTimeSeconds={allCourseLearningStats?.totalTimeSeconds}
    >
      {children}
    </SetCourseContext>
  );
}
