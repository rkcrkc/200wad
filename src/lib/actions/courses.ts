"use server";

import { getCourses } from "@/lib/queries/courses";
import { getLanguages } from "@/lib/queries/languages";

export interface DropdownCourse {
  id: string;
  name: string;
  level: string | null;
  cefr_range: string | null;
  progressPercent: number;
  status: "not-started" | "learning" | "mastered";
}

export interface DropdownLanguageGroup {
  languageId: string;
  languageName: string;
  languageCode: string;
  courses: DropdownCourse[];
}

/**
 * Courses for the header course switcher, grouped by every language the user is
 * enrolled in. Each group carries its language label; the component renders a
 * header per language with that language's courses beneath it.
 */
export async function getGroupedCoursesForDropdown(): Promise<{
  groups: DropdownLanguageGroup[];
  currentCourseId: string | null;
}> {
  const { languages } = await getLanguages({ visibleOnly: false });
  const enrolled = languages.filter((l) => l.isEnrolled);

  const results = await Promise.all(
    enrolled.map(async (lang) => {
      const { courses, currentCourseId } = await getCourses(lang.id);
      return {
        currentCourseId,
        group: {
          languageId: lang.id,
          languageName: lang.name,
          languageCode: lang.code,
          courses: courses.map((c) => ({
            id: c.id,
            name: c.name,
            level: c.level,
            cefr_range: c.cefr_range,
            progressPercent: c.progressPercent,
            status: c.status,
          })),
        } satisfies DropdownLanguageGroup,
      };
    })
  );

  const currentCourseId =
    results.find((r) => r.currentCourseId)?.currentCourseId ?? null;

  return {
    groups: results.map((r) => r.group).filter((g) => g.courses.length > 0),
    currentCourseId,
  };
}
