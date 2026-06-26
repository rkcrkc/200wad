"use server";

import { createClient } from "@/lib/supabase/server";
import { getCourses } from "@/lib/queries/courses";
import { getUserSubscriptions } from "@/lib/queries/subscriptions";
import { getDefaultFreeLessons } from "@/lib/utils/accessControl";
import type {
  LanguageCoursesResult,
  CourseExpansion,
  CourseExpansionWord,
  CourseWithExpansion,
} from "@/lib/queries/languageCourses.types";

/**
 * Courses for a single language, shaped for the My Languages accordion body.
 * Lazy-loaded on first expand so the dashboard only pays for the languages a
 * user actually opens. Derives a per-course locked-lesson count from the user's
 * effective subscriptions rather than querying every lesson individually:
 * `lockedLessonCount = hasAccess ? 0 : max(0, totalLessons - free_lessons)`.
 */
export async function getLanguageCoursesByLanguage(
  languageId: string
): Promise<LanguageCoursesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ courses, currentCourseId }, subsResult, defaultFreeLessons] =
    await Promise.all([
      getCourses(languageId),
      user
        ? getUserSubscriptions()
        : Promise.resolve({ subscriptions: [], error: null }),
      getDefaultFreeLessons(),
    ]);

  // Effective subscriptions grant access to all lessons in their target scope.
  const effectiveSubs = subsResult.subscriptions.filter((s) => s.isEffective);
  const hasAllAccess = effectiveSubs.some((s) => s.type === "all-languages");
  const hasLanguageAccess = effectiveSubs.some(
    (s) => s.type === "language" && s.target_id === languageId
  );
  const accessByCourse = new Set(
    effectiveSubs
      .filter((s) => s.type === "course" && s.target_id)
      .map((s) => s.target_id as string)
  );

  const rows = courses.map((course) => {
    const hasAccess =
      hasAllAccess || hasLanguageAccess || accessByCourse.has(course.id);
    const freeLessons = course.free_lessons ?? defaultFreeLessons;
    const lockedLessonCount = hasAccess
      ? 0
      : Math.max(0, course.totalLessons - freeLessons);

    return {
      id: course.id,
      name: course.name,
      description: course.description,
      level: course.level,
      cefr_range: course.cefr_range,
      progressPercent: course.progressPercent,
      isCurrent: course.id === currentCourseId,
      totalLessons: course.totalLessons,
      lockedLessonCount,
    };
  });

  // Surface the course the user is currently studying first.
  rows.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));

  return { courses: rows };
}

/** Max words surfaced per lesson tab when a course card is expanded. */
const WORDS_PER_LESSON = 12;

/**
 * The course's published lessons as tabs, each carrying a capped sample of its
 * words (in curated `sort_order`) for the thumbnail strip beneath the tabs.
 * Lazy-loaded when a course card is expanded on the Languages page.
 *
 * `lockedFromNumber` is the free-lesson cutoff: lessons whose `number` exceeds
 * it are gated (rendered blurred + locked). Pass `null` when the user has full
 * access so nothing is locked.
 */
export async function getCourseExpansion(
  courseId: string,
  lockedFromNumber: number | null = null
): Promise<CourseExpansion> {
  const supabase = await createClient();

  const { data: lessonsData, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, emoji, number")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("sort_order")
    .order("number");

  if (lessonsError) {
    return { lessons: [], error: lessonsError.message };
  }

  const baseLessons = (lessonsData ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    emoji: l.emoji,
    isLocked: lockedFromNumber !== null && l.number > lockedFromNumber,
  }));

  if (baseLessons.length === 0) {
    return { lessons: [] };
  }

  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select(
      "lesson_id, sort_order, words(id, english, headword, memory_trigger_image_url)"
    )
    .in(
      "lesson_id",
      baseLessons.map((l) => l.id)
    )
    .order("sort_order");

  // Bucket each lesson's words in sort order, deduped and capped per lesson.
  const wordsByLesson = new Map<string, CourseExpansionWord[]>();
  for (const row of lessonWords ?? []) {
    const w = row.words as {
      id: string;
      english: string;
      headword: string;
      memory_trigger_image_url: string | null;
    } | null;
    if (!w) continue;
    const list = wordsByLesson.get(row.lesson_id) ?? [];
    if (list.length >= WORDS_PER_LESSON || list.some((x) => x.id === w.id)) {
      wordsByLesson.set(row.lesson_id, list);
      continue;
    }
    list.push({
      id: w.id,
      english: w.english,
      foreign: w.headword,
      imageUrl: w.memory_trigger_image_url,
    });
    wordsByLesson.set(row.lesson_id, list);
  }

  const lessons = baseLessons.map((l) => ({
    ...l,
    words: wordsByLesson.get(l.id) ?? [],
  }));

  return { lessons };
}

/**
 * A language's courses, each bundled with its lesson/word expansion. Loaded
 * server-side so the Languages page can render fully-populated course cards on
 * first paint — no client round-trip when a language is expanded.
 */
export async function getLanguageCourseBundles(
  languageId: string
): Promise<CourseWithExpansion[]> {
  const { courses } = await getLanguageCoursesByLanguage(languageId);
  const expansions = await Promise.all(
    courses.map((course) => {
      // Derive the free-lesson cutoff from the already-computed locked count:
      // freeCutoff = totalLessons - lockedLessonCount (== free_lessons when
      // gated, == totalLessons when the user has access so nothing locks).
      const lockedFromNumber =
        course.lockedLessonCount > 0
          ? course.totalLessons - course.lockedLessonCount
          : null;
      return getCourseExpansion(course.id, lockedFromNumber);
    })
  );
  return courses.map((course, i) => ({ course, expansion: expansions[i] }));
}
