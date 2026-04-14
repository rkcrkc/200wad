"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { getCoursesForDropdown, type DropdownCourse } from "@/lib/actions/courses";
import { setCurrentCourse } from "@/lib/mutations/settings";
import { formatPercent } from "@/lib/utils/helpers";

const levelStyles = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
};

const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

interface CourseDropdownProps {
  languageFlag: string;
  languageId: string;
  courseId: string;
  courseName: string;
}

export function CourseDropdown({
  languageFlag,
  languageId,
  courseId,
  courseName,
}: CourseDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<DropdownCourse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch fresh courses every time dropdown opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getCoursesForDropdown(languageId).then((result) => {
      setCourses(result.courses);
      setLoading(false);
    });
  }, [open, languageId]);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const handleSelectCourse = useCallback(
    async (selectedId: string) => {
      if (selectedId === courseId) {
        setOpen(false);
        return;
      }
      await setCurrentCourse(selectedId);
      setOpen(false);
      router.push(`/course/${selectedId}/schedule`);
    },
    [courseId, router]
  );

  const handleSwitchLanguage = useCallback(() => {
    setOpen(false);
    router.push("/dashboard?pick=true");
  }, [router]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      <div className="flex h-12 w-full cursor-pointer items-center rounded-[10px] transition-all hover:bg-bone-hover">
        <div className="flex h-full min-w-0 items-center gap-3 pl-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center text-[22px]">
            {languageFlag}
          </div>
          <div className="flex min-w-0 flex-col items-start">
            <span className="text-muted-foreground text-[11px] leading-[1.35] font-medium tracking-[-0.275px]">
              Learning
            </span>
            <span className="text-foreground truncate text-[15px] leading-[1.35] font-semibold tracking-[-0.225px]">
              {courseName}
            </span>
          </div>
        </div>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[260px] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
          {/* Label */}
          <div className="px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[14px] font-medium">
              Switch course
            </span>
          </div>

          {/* Courses list (excluding current) */}
          <div className="max-h-[320px] overflow-y-auto pb-1">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
              </div>
            ) : (() => {
              const otherCourses = courses?.filter((c) => c.id !== courseId) ?? [];
              return otherCourses.length > 0 ? (
                otherCourses.map((course) => {
                  const level = (course.level || "beginner") as keyof typeof levelStyles;
                  return (
                    <button
                      key={course.id}
                      onClick={() => handleSelectCourse(course.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bone-hover"
                    >
                      {/* Course info */}
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground truncate text-[14px] leading-[1.35] font-medium">
                          {course.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium leading-[1.35] ${levelStyles[level]}`}
                          >
                            {levelLabels[course.level || "beginner"] || course.level}
                            {course.cefr_range && ` · ${course.cefr_range}`}
                          </span>
                        </div>
                      </div>

                      {/* Progress */}
                      <span className="text-muted-foreground shrink-0 text-[12px] font-medium">
                        {formatPercent(course.progressPercent)}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No other courses available
                </div>
              );
            })()}
          </div>

          {/* Footer: Switch language */}
          <div className="border-t border-gray-100">
            <button
              onClick={handleSwitchLanguage}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bone-hover"
            >
              <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.67} />
              <span className="text-foreground text-[14px] font-medium">
                Switch language
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
