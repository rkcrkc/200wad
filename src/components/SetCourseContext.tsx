"use client";

import { useSetCourseContext, CourseContextValue } from "@/context/CourseContext";

interface SetCourseContextProps extends CourseContextValue {
  children: React.ReactNode;
}

/**
 * Client component that sets the course context for the header.
 * Wrap page content in this component and provide language/course info.
 */
export function SetCourseContext({
  children,
  languageId,
  languageFlag,
  languageName,
  courseId,
  courseName,
  dueTestsCount,
}: SetCourseContextProps) {
  useSetCourseContext({
    languageId,
    languageFlag,
    languageName,
    courseId,
    courseName,
    dueTestsCount,
  });
  return <>{children}</>;
}
