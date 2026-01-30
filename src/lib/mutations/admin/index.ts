/**
 * Admin mutations index
 * Re-exports all admin content management server actions
 */

export {
  createLanguage,
  updateLanguage,
  deleteLanguage,
  reorderLanguages,
} from "./languages";

export {
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  reorderCourses,
} from "./courses";

export {
  createLesson,
  updateLesson,
  deleteLesson,
  publishLesson,
  unpublishLesson,
  reorderLessons,
  cloneLesson,
} from "./lessons";

export {
  createWord,
  updateWord,
  deleteWord,
  reorderWords,
} from "./words";

export {
  createSentence,
  updateSentence,
  deleteSentence,
} from "./sentences";

export type {
  MutationResult,
  CreateLanguageResult,
} from "./languages";

export type { CreateCourseResult } from "./courses";

export type { CreateLessonResult } from "./lessons";

export type { CreateWordResult } from "./words";

export type { CreateSentenceResult } from "./sentences";
