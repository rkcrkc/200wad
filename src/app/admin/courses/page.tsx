import { createClient } from "@/lib/supabase/server";
import { CoursesClient } from "./CoursesClient";

async function getData() {
  const supabase = await createClient();

  // Fetch languages for the filter dropdown
  const { data: languages } = await supabase
    .from("languages")
    .select("id, name, flag")
    .order("sort_order", { ascending: true });

  // Fetch all courses with language info and lesson count
  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      *,
      language:languages(id, name, flag),
      lessons:lessons(count)
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
    return { languages: languages || [], courses: [] };
  }

  // Transform the data
  const transformedCourses = courses.map((course) => ({
    ...course,
    language: (course as any).language,
    lessonCount: ((course as any).lessons as any)?.[0]?.count || 0,
  }));

  return {
    languages: languages || [],
    courses: transformedCourses,
  };
}

export default async function CoursesPage() {
  const { languages, courses } = await getData();

  return (
    <div>
      <CoursesClient languages={languages} courses={courses} />
    </div>
  );
}
