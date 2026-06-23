"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import {
  getGroupedCoursesForDropdown,
  type DropdownLanguageGroup,
} from "@/lib/actions/courses";
import { setCurrentCourse } from "@/lib/mutations/settings";
import { getFlagFromCode } from "@/lib/utils/flags";
import { formatPercent } from "@/lib/utils/helpers";

interface CourseDropdownProps {
  languageFlag: string;
  languageId: string;
  courseId: string;
  courseName: string;
  /** Collapsed sidebar: show only the language flag, dropdown still works on hover */
  collapsed?: boolean;
}

/** Gap kept between the dropdown's bottom edge and the viewport bottom. */
const VIEWPORT_BOTTOM_GAP = 16;

export function CourseDropdown({
  languageFlag,
  languageId,
  courseId,
  courseName,
  collapsed = false,
}: CourseDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<DropdownLanguageGroup[] | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spinner only on the first-ever open; later opens refetch silently behind the
  // existing list so switching courses doesn't flash a loader.
  const loading = groups === null;

  // Fetch fresh courses every time dropdown opens. languageId is unused for the
  // query (we show every enrolled language) but kept in deps so reopening after
  // a course switch refetches.
  useEffect(() => {
    if (!open) return;
    getGroupedCoursesForDropdown().then((result) => {
      setGroups(result.groups);
    });
  }, [open, languageId]);

  // Bound the panel so its bottom sits just above the viewport bottom; the inner
  // list then scrolls internally when the content is taller than that.
  useEffect(() => {
    if (!open) return;
    function recompute() {
      const panel = panelRef.current;
      if (!panel) return;
      const top = panel.getBoundingClientRect().top;
      setMaxHeight(window.innerHeight - top - VIEWPORT_BOTTOM_GAP);
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [open, groups]);

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
      if (selectedId !== courseId) {
        await setCurrentCourse(selectedId);
      }
      setOpen(false);
      router.push(`/course/${selectedId}/schedule`);
    },
    [courseId, router]
  );

  const handleManageLanguages = useCallback(() => {
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
      <div
        onClick={() => handleSelectCourse(courseId)}
        className={`flex h-12 w-full cursor-pointer items-center rounded-[10px] transition-all hover:bg-bone-hover ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {collapsed ? (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center text-[22px]">
            {languageFlag}
          </div>
        ) : (
          <div className="flex h-full min-w-0 flex-1 items-center gap-3 pl-4 pr-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center text-[22px]">
              {languageFlag}
            </div>
            <div className="flex min-w-0 flex-col items-start">
              <span className="text-muted-foreground text-[11px] leading-[1.35] font-medium tracking-[-0.275px]">
                Learning
              </span>
              <span className="max-w-full text-foreground truncate text-[15px] leading-[1.35] font-semibold tracking-[-0.225px]">
                {courseName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-50 mt-1 flex min-w-[260px] flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
          style={maxHeight ? { maxHeight } : undefined}
        >
          {/* Scrollable language groups */}
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
              </div>
            ) : groups && groups.length > 0 ? (
              groups.map((group) => (
                <div
                  key={group.languageId}
                  className="border-t border-gray-100 pb-1 pt-1 first:border-t-0 first:pt-0"
                >
                  {/* Language header */}
                  <div className="flex items-center gap-2 px-4 pt-2 pb-1">
                    <span className="text-[15px] leading-none">
                      {getFlagFromCode(group.languageCode)}
                    </span>
                    <span className="text-muted-foreground text-[12px] font-semibold uppercase tracking-[0.04em]">
                      {group.languageName}
                    </span>
                  </div>

                  {/* Courses for this language */}
                  {group.courses.map((course) => {
                    const isCurrent = course.id === courseId;
                    return (
                      <button
                        key={course.id}
                        onClick={() => handleSelectCourse(course.id)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bone-hover"
                      >
                        {/* Leading slot: only the active course gets a blue check;
                            other rows align their name to the left. */}
                        {isCurrent && (
                          <span className="bg-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </span>
                        )}

                        {/* Course name */}
                        <span className="text-foreground min-w-0 flex-1 truncate text-[14px] leading-[1.35] font-medium">
                          {course.name}
                        </span>

                        {/* Progress */}
                        <span className="text-muted-foreground shrink-0 text-[12px] font-medium">
                          {formatPercent(course.progressPercent)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No courses available
              </div>
            )}
          </div>

          {/* Footer: Manage languages */}
          <div className="shrink-0 border-t border-gray-100">
            <button
              onClick={handleManageLanguages}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bone-hover"
            >
              <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.67} />
              <span className="text-foreground text-[14px] font-medium">
                Manage languages
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
