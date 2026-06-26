/**
 * Shapes for the lazy-loaded accordion body on the My Languages page.
 * Kept in a plain module (not the "use server" file) because a server-action
 * module may only export async functions.
 */

export interface LanguageCourseRow {
  id: string;
  name: string;
  /** Short course blurb shown beneath the name on the card. */
  description: string | null;
  /** Difficulty level (beginner/intermediate/advanced); null defaults shown. */
  level: string | null;
  /** CEFR span e.g. "A1-A2", appended to the level badge when present. */
  cefr_range: string | null;
  /** Word-based course progress, 0-100 (matches the course header bar). */
  progressPercent: number;
  /** True when this is the user's selected course (users.current_course_id). */
  isCurrent: boolean;
  totalLessons: number;
  /** Lessons gated behind a subscription: 0 when the user has access. */
  lockedLessonCount: number;
}

export interface LanguageCoursesResult {
  courses: LanguageCourseRow[];
  error?: string;
}

/** A word (with concept thumbnail) shown under its lesson tab. */
export interface CourseExpansionWord {
  id: string;
  english: string;
  /** The foreign-language word (the `headword` column). */
  foreign: string;
  imageUrl: string | null;
}

/** A lesson tab shown when a course card is expanded, with its own words. */
export interface CourseExpansionLesson {
  id: string;
  title: string;
  emoji: string | null;
  /** True when gated behind a subscription: its words render blurred + locked. */
  isLocked: boolean;
  words: CourseExpansionWord[];
}

export interface CourseExpansion {
  lessons: CourseExpansionLesson[];
  error?: string;
}

/** A course row paired with its (eagerly-loaded) lesson/word expansion. */
export interface CourseWithExpansion {
  course: LanguageCourseRow;
  expansion: CourseExpansion;
}
