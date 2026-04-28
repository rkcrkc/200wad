"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CourseContextValue {
  languageId?: string;
  languageFlag?: string;
  languageName?: string;
  courseId?: string;
  courseName?: string;
  dueTestsCount?: number;
  // Course-scoped header stats. Populated by the course-scoped layout so the
  // header shows numbers for the course in the URL, not whichever course is
  // persisted in users.current_course_id (which can be stale on navigation).
  wordsMastered?: number;
  totalWords?: number;
  courseProgressPercent?: number;
}

interface CourseContextState {
  value: CourseContextValue;
  setValue: (v: CourseContextValue | ((prev: CourseContextValue) => CourseContextValue)) => void;
}

const CourseContext = createContext<CourseContextState>({
  value: {},
  setValue: () => {},
});

interface CourseProviderProps {
  children: ReactNode;
}

export function CourseProvider({ children }: CourseProviderProps) {
  const [value, setValue] = useState<CourseContextValue>({});

  return (
    <CourseContext.Provider value={{ value, setValue }}>
      {children}
    </CourseContext.Provider>
  );
}

/**
 * Hook to get the current course context values
 */
export function useCourseContext() {
  const { value } = useContext(CourseContext);
  return value;
}

/**
 * Hook to set the course context from page components.
 * Call this in pages that should update the header.
 *
 * IMPORTANT: This merges with existing values rather than replacing.
 * Only explicitly provided values (not undefined) will update the context.
 * This allows pages to update just the language info while preserving course info.
 */
export function useSetCourseContext(contextValue: CourseContextValue) {
  const { setValue } = useContext(CourseContext);

  useEffect(() => {
    // Use functional update to merge new values with existing
    // Only fields that are explicitly provided (not undefined) will update
    setValue((prev) => ({
      languageId: contextValue.languageId !== undefined ? contextValue.languageId : prev.languageId,
      languageFlag: contextValue.languageFlag !== undefined ? contextValue.languageFlag : prev.languageFlag,
      languageName: contextValue.languageName !== undefined ? contextValue.languageName : prev.languageName,
      courseId: contextValue.courseId !== undefined ? contextValue.courseId : prev.courseId,
      courseName: contextValue.courseName !== undefined ? contextValue.courseName : prev.courseName,
      dueTestsCount: contextValue.dueTestsCount !== undefined ? contextValue.dueTestsCount : prev.dueTestsCount,
      wordsMastered: contextValue.wordsMastered !== undefined ? contextValue.wordsMastered : prev.wordsMastered,
      totalWords: contextValue.totalWords !== undefined ? contextValue.totalWords : prev.totalWords,
      courseProgressPercent: contextValue.courseProgressPercent !== undefined ? contextValue.courseProgressPercent : prev.courseProgressPercent,
    }));
    // Don't clear context on unmount - preserve it for navigation
  }, [
    contextValue.languageId,
    contextValue.languageFlag,
    contextValue.languageName,
    contextValue.courseId,
    contextValue.courseName,
    contextValue.dueTestsCount,
    contextValue.wordsMastered,
    contextValue.totalWords,
    contextValue.courseProgressPercent,
    setValue,
  ]);
}
