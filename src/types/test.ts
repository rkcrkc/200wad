/**
 * Test type determines what is shown and what the user types
 * - Type A: english-to-foreign (default)
 * - Type B: foreign-to-english
 * - Type C: picture-only
 */
export type TestType =
  | "english-to-foreign"  // Type A: Show English word, type foreign word (default)
  | "foreign-to-english"  // Type B: Show foreign word, type English
  | "picture-only";       // Type C: Show picture only, type foreign word

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  "english-to-foreign": "Test Foreign",
  "foreign-to-english": "Test English",
  "picture-only": "Test Picture",
};

export const TEST_TYPE_DESCRIPTIONS: Record<TestType, string> = {
  "english-to-foreign": "See the English word, type the Foreign word",
  "foreign-to-english": "See the Foreign word, type the English word",
  "picture-only": "See the picture only, type the Foreign word",
};

export const DEFAULT_TEST_TYPE: TestType = "english-to-foreign";
