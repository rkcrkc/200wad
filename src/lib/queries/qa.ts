import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/utils";
import {
  QA_FLAG_DEFINITIONS,
  type QaFlag,
} from "./qa-lessons";

/**
 * Server-side queries backing the admin-only QA lessons section.
 *
 * A word is "in the course" if it belongs to a `lesson_words` row whose
 * `lessons.course_id = courseId`. We scope with an embedded `lessons!inner`
 * filter rather than fetching course word ids and pushing them back through a
 * `.in(...)` filter — that path silently returns empty on courses with ~1k+
 * words because the UUID list overflows the request URL (see the "notes"
 * branch in `getAutoLessonWords`).
 *
 * A word can appear in multiple lessons, so `lesson_words` yields duplicate
 * `word_id`s; we dedupe (keeping first-seen order) before counting/returning.
 */

type CourseFlagRow = {
  word_id: string | null;
  sort_order: number | null;
  lessons: { sort_order: number | null; number: number | null } | null;
  words: {
    developer_notes: string | null;
    picture_wrong: boolean | null;
    picture_missing: boolean | null;
    picture_bad_svg: boolean | null;
    picture_mp4_defect: boolean | null;
    audio_rerecord: boolean | null;
    notes_in_memory_trigger: boolean | null;
  } | null;
};

type CourseWord = {
  wordId: string;
  lessonSort: number;
  lessonNumber: number;
  wordSort: number;
  flags: NonNullable<CourseFlagRow["words"]>;
};

/**
 * Whether a word is "flagged" for a given QA flag. Text flags
 * (`developer_notes`) count as flagged only when non-null AND non-empty after
 * trimming; boolean flags count when strictly `true`.
 */
function isFlagged(flags: CourseWord["flags"], flag: QaFlag): boolean {
  if (flag === "developer_notes") {
    const note = flags.developer_notes;
    return typeof note === "string" && note.trim().length > 0;
  }
  return flags[flag] === true;
}

/**
 * Fetch every course word once, with its 7 QA-flag columns and enough
 * ordering info (lesson order + within-lesson sort) to return a stable Study
 * order. Deduped by `word_id`, ordered by (lesson sort, lesson number,
 * lesson_words sort).
 */
async function getCourseFlaggedWords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
): Promise<CourseWord[]> {
  const rows = await fetchAllRows<CourseFlagRow>(
    (from, to) =>
      supabase
        .from("lesson_words")
        .select(
          "word_id, sort_order, lessons!inner(course_id, sort_order, number), words!inner(developer_notes, picture_wrong, picture_missing, picture_bad_svg, picture_mp4_defect, audio_rerecord, notes_in_memory_trigger)",
        )
        .eq("lessons.course_id", courseId)
        .range(from, to),
    { label: "getCourseFlaggedWords:lesson_words" },
  );

  // Dedupe by word_id, keeping the occurrence with the lowest (lessonSort,
  // lessonNumber, wordSort) so a word shared across lessons sorts by its
  // earliest placement.
  const byWord = new Map<string, CourseWord>();
  for (const row of rows) {
    if (!row.word_id || !row.words) continue;
    const candidate: CourseWord = {
      wordId: row.word_id,
      lessonSort: row.lessons?.sort_order ?? 0,
      lessonNumber: row.lessons?.number ?? 0,
      wordSort: row.sort_order ?? 0,
      flags: row.words,
    };
    const existing = byWord.get(row.word_id);
    if (!existing || compareCourseWord(candidate, existing) < 0) {
      byWord.set(row.word_id, candidate);
    }
  }

  return Array.from(byWord.values()).sort(compareCourseWord);
}

function compareCourseWord(a: CourseWord, b: CourseWord): number {
  if (a.lessonSort !== b.lessonSort) return a.lessonSort - b.lessonSort;
  if (a.lessonNumber !== b.lessonNumber) return a.lessonNumber - b.lessonNumber;
  if (a.wordSort !== b.wordSort) return a.wordSort - b.wordSort;
  return a.wordId.localeCompare(b.wordId);
}

/**
 * Per-flag count of flagged words in a course, keyed by flag. Used to render
 * the QA tiles (count badge; `0` → greyed/disabled tile).
 */
export async function getQaFlagCounts(
  courseId: string,
): Promise<Record<QaFlag, number>> {
  const supabase = await createClient();
  const courseWords = await getCourseFlaggedWords(supabase, courseId);

  const counts = QA_FLAG_DEFINITIONS.reduce(
    (acc, def) => {
      acc[def.key] = 0;
      return acc;
    },
    {} as Record<QaFlag, number>,
  );

  for (const word of courseWords) {
    for (const def of QA_FLAG_DEFINITIONS) {
      if (isFlagged(word.flags, def.key)) counts[def.key] += 1;
    }
  }

  return counts;
}

/**
 * Ordered word ids in a course flagged for a single QA flag, for Study.
 * Order matches the course's lesson/word placement (stable across reloads).
 */
export async function getQaFlaggedWordIds(
  courseId: string,
  flag: QaFlag,
): Promise<string[]> {
  const supabase = await createClient();
  const courseWords = await getCourseFlaggedWords(supabase, courseId);
  return courseWords
    .filter((word) => isFlagged(word.flags, flag))
    .map((word) => word.wordId);
}
