/**
 * LocalStorage utilities for persisting study/test session progress.
 * Prevents data loss if the user closes the tab mid-session.
 * Progress is synced to DB only on session completion.
 */

export type SessionType = "study" | "test";

export interface WordProgressEntry {
  isCorrect: boolean;
  userNotes: string | null;
  answeredAt: string;
}

export interface StoredSessionProgress {
  sessionType: SessionType;
  sessionId: string;
  lessonId: string;
  startedAt: string;
  currentWordIndex: number;
  wordProgress: Record<string, WordProgressEntry>;
}

const STORAGE_KEY_PREFIX = "200wad";

/**
 * Get the localStorage key for a session
 */
function getStorageKey(sessionType: SessionType, sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}_${sessionType}_session_${sessionId}`;
}

/**
 * Get the localStorage key pattern for finding sessions by lesson
 */
function getLessonSessionKey(sessionType: SessionType, lessonId: string): string {
  return `${STORAGE_KEY_PREFIX}_${sessionType}_lesson_${lessonId}`;
}

/**
 * Save or update session progress to localStorage
 */
export function saveSessionProgress(
  sessionType: SessionType,
  sessionId: string,
  lessonId: string,
  currentWordIndex: number,
  wordProgress: Record<string, WordProgressEntry>
): void {
  if (typeof window === "undefined") return;

  const key = getStorageKey(sessionType, sessionId);
  const data: StoredSessionProgress = {
    sessionType,
    sessionId,
    lessonId,
    startedAt: new Date().toISOString(),
    currentWordIndex,
    wordProgress,
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Also store a reference by lessonId for resumption lookup
    localStorage.setItem(getLessonSessionKey(sessionType, lessonId), sessionId);
  } catch (error) {
    console.error("Failed to save session progress to localStorage:", error);
  }
}

/**
 * Update a single word's progress in localStorage
 */
export function updateWordProgress(
  sessionType: SessionType,
  sessionId: string,
  wordId: string,
  progress: WordProgressEntry,
  currentWordIndex: number
): void {
  if (typeof window === "undefined") return;

  const existing = getSessionProgress(sessionType, sessionId);
  if (!existing) return;

  existing.wordProgress[wordId] = progress;
  existing.currentWordIndex = currentWordIndex;

  try {
    const key = getStorageKey(sessionType, sessionId);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (error) {
    console.error("Failed to update word progress in localStorage:", error);
  }
}

/**
 * Get session progress from localStorage
 */
export function getSessionProgress(
  sessionType: SessionType,
  sessionId: string
): StoredSessionProgress | null {
  if (typeof window === "undefined") return null;

  const key = getStorageKey(sessionType, sessionId);

  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as StoredSessionProgress;
  } catch (error) {
    console.error("Failed to read session progress from localStorage:", error);
    return null;
  }
}

/**
 * Check if there's an incomplete session for a lesson
 * Returns the sessionId if found, null otherwise
 */
export function getIncompleteSessionId(
  sessionType: SessionType,
  lessonId: string
): string | null {
  if (typeof window === "undefined") return null;

  try {
    const sessionId = localStorage.getItem(getLessonSessionKey(sessionType, lessonId));
    if (!sessionId) return null;

    // Verify the session data still exists
    const progress = getSessionProgress(sessionType, sessionId);
    if (!progress) {
      // Clean up stale reference
      localStorage.removeItem(getLessonSessionKey(sessionType, lessonId));
      return null;
    }

    return sessionId;
  } catch (error) {
    console.error("Failed to check for incomplete session:", error);
    return null;
  }
}

/**
 * Clear session progress from localStorage (call after successful DB sync)
 */
export function clearSessionProgress(
  sessionType: SessionType,
  sessionId: string,
  lessonId: string
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(getStorageKey(sessionType, sessionId));
    localStorage.removeItem(getLessonSessionKey(sessionType, lessonId));
  } catch (error) {
    console.error("Failed to clear session progress from localStorage:", error);
  }
}

/**
 * Initialize a new session in localStorage
 */
export function initSessionProgress(
  sessionType: SessionType,
  sessionId: string,
  lessonId: string
): void {
  saveSessionProgress(sessionType, sessionId, lessonId, 0, {});
}
