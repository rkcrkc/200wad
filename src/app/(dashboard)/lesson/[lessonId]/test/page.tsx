import { getWords, isAutoLesson } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import { canAccessLesson } from "@/lib/utils/accessControl";
import { createClient } from "@/lib/supabase/server";
import { getToastTemplates } from "@/lib/queries/notification-config";
import { TestModeClient } from "./TestModeClient";
import { TestType, DEFAULT_TEST_TYPE } from "@/types/test";

interface TestPageProps {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ type?: string; twice?: string; random?: string; milestone?: string }>;
}

export default async function TestPage({ params, searchParams }: TestPageProps) {
  const { lessonId } = await params;
  const { type, twice, random, milestone } = await searchParams;
  const testTwice = twice === "true";
  const randomOrder = random === "true";
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
      redirect(`/course/${course.id}?upgrade-lesson=${encodeURIComponent(lesson.id)}`);
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

  // Fetch initial course vocab count for the completed modal,
  // plus lifetime learned/mastered counts for first-time toast detection.
  let initialCourseVocabCount: number | null = null;
  let priorLearnedCount = 0;
  let priorMasteredCount = 0;
  if (userId) {
    const supabase = await createClient();

    const vocabPromise = course
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- function not yet in generated types
      ? (supabase.rpc as any)("get_course_vocab_count", {
          p_user_id: userId,
          p_course_id: course.id,
        })
      : Promise.resolve({ data: null });

    const [vocabResult, learnedResult, masteredResult] = await Promise.all([
      vocabPromise,
      supabase
        .from("user_word_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("learned_at", "is", null),
      supabase
        .from("user_word_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("mastered_at", "is", null),
    ]);

    initialCourseVocabCount = course ? ((vocabResult.data as number) || 0) : null;
    priorLearnedCount = learnedResult.count ?? 0;
    priorMasteredCount = masteredResult.count ?? 0;
  }

  // Pre-fetch admin-managed toast templates so the client doesn't have to
  // round-trip when an answer fires the toast. Falls back to {} for guests
  // (we don't toast for guests anyway).
  const toastTemplates = userId
    ? await getToastTemplates([
        "achievement.first_word_learned",
        "achievement.first_word_mastered",
      ])
    : {};

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
      randomOrder={randomOrder}
      milestone={milestone || null}
      initialCourseVocabCount={initialCourseVocabCount}
      priorLearnedCount={priorLearnedCount}
      priorMasteredCount={priorMasteredCount}
      toastTemplates={toastTemplates}
    />
  );
}
