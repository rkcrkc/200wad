import { createClient } from "@/lib/supabase/server";
import { CoursesClient } from "./CoursesClient";
import type { LanguageGreetings } from "@/types/database";

async function getData() {
  const supabase = await createClient();

  // Fetch languages (full row + course count) for management on this page
  const { data: languages } = await supabase
    .from("languages")
    .select(`
      id,
      name,
      native_name,
      code,
      sort_order,
      is_visible,
      greetings,
      courses:courses(count)
    `)
    .order("sort_order", { ascending: true });

  // Fetch all courses with language info and lesson count
  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      *,
      language:languages(id, name, code),
      lessons:lessons(count)
    `)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  // Fetch all lessons with word count
  const { data: lessons } = await supabase
    .from("lessons")
    .select(`
      id,
      course_id,
      number,
      title,
      emoji,
      word_count,
      sort_order,
      is_published
    `)
    .order("sort_order", { ascending: true });

  // Transform languages: cast greetings and flatten course count
  const transformedLanguages = (languages || []).map((lang) => {
    const { courses: courseCountRows, ...rest } = lang as typeof lang & {
      courses: { count: number }[];
    };
    return {
      ...rest,
      greetings: rest.greetings as LanguageGreetings | null,
      courseCount: courseCountRows?.[0]?.count || 0,
    };
  });

  if (error) {
    console.error("Error fetching courses:", error);
    return { languages: transformedLanguages, courses: [], lessons: [] };
  }

  // Transform the data. Supabase types the `language` to-one embed as an array
  // and `lessons(count)` as a `{ count }[]`, so read them via a normalised type.
  type CourseEmbeds = {
    language: { id: string; name: string; code: string } | null;
    lessons: { count: number }[];
  };
  const transformedCourses = courses.map((course) => {
    const embeds = course as unknown as CourseEmbeds;
    return {
      ...course,
      language: embeds.language,
      lessonCount: embeds.lessons?.[0]?.count || 0,
    };
  });

  return {
    languages: transformedLanguages,
    courses: transformedCourses,
    lessons: lessons || [],
  };
}

interface SearchParams {
  course?: string;
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { languages, courses, lessons } = await getData();

  return (
    <div>
      <CoursesClient
        languages={languages}
        courses={courses}
        lessons={lessons}
        initialCourseId={params.course}
      />
    </div>
  );
}
