"use server";

import { getCourses } from "@/lib/queries/courses";

export interface DropdownCourse {
  id: string;
  name: string;
  level: string | null;
  cefr_range: string | null;
  progressPercent: number;
  status: "not-started" | "learning" | "mastered";
}

export async function getCoursesForDropdown(
  languageId: string
): Promise<{ courses: DropdownCourse[] }> {
  const { courses } = await getCourses(languageId);

  return {
    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      cefr_range: c.cefr_range,
      progressPercent: c.progressPercent,
      status: c.status,
    })),
  };
}
