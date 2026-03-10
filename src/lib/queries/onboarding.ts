import { createClient } from "@/lib/supabase/server";

export interface CoursePreview {
  id: string;
  name: string;
  level: string | null;
  thumbnailUrl: string | null;
  wordCount: number | null;
}

export interface LanguageWithCourses {
  id: string;
  name: string;
  nativeName: string;
  code: string;
  courses: CoursePreview[];
}

export async function getLanguagesWithCourses(): Promise<LanguageWithCourses[]> {
  const supabase = await createClient();

  // Fetch visible languages
  const { data: languages, error: langError } = await supabase
    .from("languages")
    .select("id, name, native_name, code")
    .eq("is_visible", true)
    .order("sort_order");

  if (langError || !languages) {
    console.error("Error fetching languages:", langError);
    return [];
  }

  // Fetch published courses
  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("id, name, level, thumbnail_url, word_count, language_id")
    .eq("is_published", true)
    .order("sort_order");

  if (courseError) {
    console.error("Error fetching courses:", courseError);
    return [];
  }

  // Group courses by language
  const coursesByLanguage: Record<string, CoursePreview[]> = {};
  courses?.forEach((course) => {
    if (course.language_id) {
      if (!coursesByLanguage[course.language_id]) {
        coursesByLanguage[course.language_id] = [];
      }
      coursesByLanguage[course.language_id].push({
        id: course.id,
        name: course.name,
        level: course.level,
        thumbnailUrl: course.thumbnail_url,
        wordCount: course.word_count,
      });
    }
  });

  // Combine and filter to only languages with courses
  const languagesWithCourses: LanguageWithCourses[] = languages
    .map((lang) => ({
      id: lang.id,
      name: lang.name,
      nativeName: lang.native_name,
      code: lang.code,
      courses: coursesByLanguage[lang.id] || [],
    }))
    .filter((lang) => lang.courses.length > 0);

  return languagesWithCourses;
}
