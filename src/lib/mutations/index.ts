export {
  createStudySession,
  endStudySession,
  saveUserNotes,
  saveSystemNotes,
  batchSaveUserNotes,
  updateLessonProgress,
  completeStudySession,
} from "./study";

export type {
  CreateStudySessionResult,
  EndStudySessionResult,
  UpdateLessonProgressResult,
} from "./study";

export {
  createTestSession,
  completeTestSession,
} from "./test";

export type {
  CreateTestSessionResult,
  TestQuestionResult,
  TestStats,
  CompleteTestSessionResult,
} from "./test";

export {
  updateProfile,
  updatePassword,
  verifyCurrentPassword,
  toggleTwoFactor,
  setCurrentLanguage,
  setCurrentCourse,
  removeLanguage,
  addLanguage,
} from "./settings";

export type { UpdateProfileData, MutationResult } from "./settings";

export { addLanguageWithCourse } from "./onboarding";

export type { AddLanguageWithCourseResult } from "./onboarding";
