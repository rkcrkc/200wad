import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { GraduationCap, ChevronRight } from "lucide-react";

type LessonWithCourse = {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  word_count: number;
  course: {
    id: string;
    name: string;
    language: { id: string; name: string; flag: string } | null;
  } | null;
};

async function getLessonsWithWords(): Promise<LessonWithCourse[]> {
  const supabase = await createClient();

  const { data: lessons, error } = await supabase
    .from("lessons")
    .select(`
      id,
      number,
      title,
      emoji,
      word_count,
      course:courses(
        id,
        name,
        language:languages(id, name, flag)
      )
    `)
    .order("course_id", { ascending: true })
    .order("number", { ascending: true });

  if (error) {
    console.error("Error fetching lessons:", error);
    return [];
  }

  return lessons as unknown as LessonWithCourse[];
}

export default async function WordsIndexPage() {
  const lessons = await getLessonsWithWords();

  // Group lessons by course
  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!lesson.course) return acc;
    const courseId = lesson.course.id;
    if (!acc[courseId]) {
      acc[courseId] = {
        course: lesson.course,
        lessons: [],
      };
    }
    acc[courseId].lessons.push(lesson);
    return acc;
  }, {} as Record<string, { course: NonNullable<LessonWithCourse["course"]>; lessons: LessonWithCourse[] }>);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Words</h1>
        <p className="mt-1 text-gray-600">
          Select a lesson to manage its vocabulary.
        </p>
      </div>

      {/* Lessons grouped by course */}
      {Object.keys(groupedLessons).length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">
            No lessons yet. Create lessons first to add words.
          </p>
          <Link
            href="/admin/lessons"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Go to Lessons
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(groupedLessons).map(({ course, lessons }) => (
            <div key={course.id}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <span className="text-xl">{course.language?.flag}</span>
                {course.name}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/admin/words/${lesson.id}`}
                    className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      {lesson.emoji && (
                        <span className="text-2xl">{lesson.emoji}</span>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          #{lesson.number} {lesson.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {lesson.word_count} word
                          {lesson.word_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
