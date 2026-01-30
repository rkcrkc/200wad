import { createClient } from "@/lib/supabase/server";
import { LessonsClient } from "./LessonsClient";

async function getData() {
  const supabase = await createClient();

  // Fetch languages for the filter dropdown
  const { data: languages } = await supabase
    .from("languages")
    .select("id, name, flag")
    .order("sort_order", { ascending: true });

  // Fetch courses for the filter dropdown
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, language_id")
    .order("sort_order", { ascending: true });

  // Fetch all lessons with course/language info and word count
  const { data: lessons, error } = await supabase
    .from("lessons")
    .select(`
      *,
      course:courses(
        id,
        name,
        language:languages(id, name, flag)
      )
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching lessons:", error);
    return { languages: languages || [], courses: courses || [], lessons: [] };
  }

  return {
    languages: languages || [],
    courses: courses || [],
    lessons: (lessons || []) as any[],
  };
}

export default async function LessonsPage() {
  const { languages, courses, lessons } = await getData();

  return (
    <div>
      <LessonsClient
        languages={languages}
        courses={courses}
        lessons={lessons}
      />
    </div>
  );
}
