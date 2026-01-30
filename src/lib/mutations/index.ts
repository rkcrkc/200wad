export {
  createStudySession,
  endStudySession,
  updateWordProgress,
  saveUserNotes,
  batchUpdateWordProgress,
  updateLessonProgress,
  completeStudySession,
} from "./study";

export type {
  CreateStudySessionResult,
  EndStudySessionResult,
  UpdateWordProgressResult,
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
  removeLanguage,
  addLanguage,
} from "./settings";

export type { UpdateProfileData, MutationResult } from "./settings";
