"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLanguageCoursesAction, type LanguageCourse } from "@/lib/mutations/subscriptions";

interface ExpandableCourseListProps {
  languageId: string;
}

export function ExpandableCourseList({ languageId }: ExpandableCourseListProps) {
  const [courses, setCourses] = useState<LanguageCourse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCourses() {
      setLoading(true);
      const result = await getLanguageCoursesAction(languageId);
      if (cancelled) return;

      if (result.success) {
        setCourses(result.courses);
      } else {
        setError(result.error || "Failed to load courses");
      }
      setLoading(false);
    }

    fetchCourses();
    return () => { cancelled = true; };
  }, [languageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-50/50 px-6 py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading courses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50/50 px-6 py-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="bg-gray-50/50 px-6 py-4">
        <p className="text-sm text-muted-foreground">No courses available yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-bone-hover bg-gray-50/50">
      {courses.map((course) => (
        <div key={course.id} className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-small-semibold">{course.name}</span>
            {course.level && (
              <Badge size="sm">
                {course.level}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}</span>
            <span>{course.actualWordCount} {course.actualWordCount === 1 ? "word" : "words"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
