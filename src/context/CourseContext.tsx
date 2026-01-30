"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CourseContextValue {
  languageId?: string;
  languageFlag?: string;
  languageName?: string;
  courseId?: string;
  courseName?: string;
  dueTestsCount?: number;
}

interface CourseContextState {
  value: CourseContextValue;
  setValue: (v: CourseContextValue) => void;
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
 */
export function useSetCourseContext(contextValue: CourseContextValue) {
  const { setValue } = useContext(CourseContext);

  useEffect(() => {
    setValue(contextValue);
    // Don't clear context on unmount - preserve it for navigation
  }, [
    contextValue.languageId,
    contextValue.languageFlag,
    contextValue.languageName,
    contextValue.courseId,
    contextValue.courseName,
    contextValue.dueTestsCount,
    setValue,
  ]);
}
