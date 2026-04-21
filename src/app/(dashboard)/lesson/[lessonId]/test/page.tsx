import { getWords, isAutoLesson } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import { canAccessLesson } from "@/lib/utils/accessControl";
import { createClient } from "@/lib/supabase/server";
import { TestModeClient } from "./TestModeClient";
import { TestType, DEFAULT_TEST_TYPE } from "@/types/test";

interface TestPageProps {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ type?: string; twice?: string; milestone?: string }>;
}

export default async function TestPage({ params, searchParams }: TestPageProps) {
  const { lessonId } = await params;
  const { type, twice, milestone } = await searchParams;
  const testTwice = twice === "true";
  const { language, course, lesson, words, isGuest, userId } = await getWords(lessonId);

  if (!lesson || words.length === 0) {
    notFound();
  }

  // Access gate: redirect to course page if lesson is locked
  if (course && !isAutoLesson(lessonId)) {
    const access = await canAccessLesson(
      userId,
      { lessonNumber: lesson.number },
      { id: course.id, language_id: course.language_id, free_lessons: course.free_lessons }
    );
    if (!access.hasAccess) {
      redirect(`/course/${course.id}?locked=${encodeURIComponent(lesson.title)}`);
    }
  }

  // Validate test type from URL, default to english-to-foreign
  const validTestTypes: TestType[] = ["english-to-foreign", "foreign-to-english", "picture-only"];
  const testType: TestType = validTestTypes.includes(type as TestType)
    ? (type as TestType)
    : DEFAULT_TEST_TYPE;

  // Filter out info pages (they only appear in lessons, not tests)
  // For picture-only mode, also filter to only words with images
  const testWords = testType === "picture-only"
    ? words.filter((w) => w.memory_trigger_image_url && w.category !== "information")
    : words.filter((w) => w.category !== "information");

  // If picture-only mode but no words with images, redirect or show error
  if (testType === "picture-only" && testWords.length === 0) {
    notFound();
  }

  // Fetch initial course vocab count for the completed modal
  let initialCourseVocabCount: number | null = null;
  if (userId && course) {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- function not yet in generated types
    const { data: vocabCount } = await (supabase.rpc as any)("get_course_vocab_count", {
      p_user_id: userId,
      p_course_id: course.id,
    });
    initialCourseVocabCount = (vocabCount as number) || 0;
  }

  // For guests, we still allow testing but won't save progress
  return (
    <TestModeClient
      lesson={lesson}
      language={language}
      course={course}
      words={testWords}
      isGuest={isGuest}
      testType={testType}
      testTwice={testTwice}
      milestone={milestone || null}
      initialCourseVocabCount={initialCourseVocabCount}
    />
  );
}
