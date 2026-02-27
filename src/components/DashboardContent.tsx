"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CourseProvider, useSetCourseContext } from "@/context/CourseContext";

interface DefaultCourseContext {
  languageId: string;
  languageFlag: string;
  languageName: string;
  courseId: string;
  courseName: string;
}

export interface HeaderStats {
  wordsPerDay: number;
  courseProgressPercent: number;
}

interface DashboardContentProps {
  children: React.ReactNode;
  dueTestsCount?: number;
  defaultCourseContext?: DefaultCourseContext;
  headerStats?: HeaderStats;
}

/**
 * Sets the default course context from server-provided data.
 * This ensures the header always shows the current course.
 * Individual pages can override this with more specific context.
 */
function DefaultContextSetter({ context }: { context?: DefaultCourseContext }) {
  useSetCourseContext(context ? {
    languageId: context.languageId,
    languageFlag: context.languageFlag,
    languageName: context.languageName,
    courseId: context.courseId,
    courseName: context.courseName,
  } : {});
  return null;
}

/**
 * Dashboard content wrapper that conditionally shows header and sidebar.
 * - /dashboard, /courses: Header full width, no sidebar
 * - /study, /test routes: No header (StudyNavbar instead), sidebar handled by page
 * - Other routes: Header full width at top, sidebar + content below
 * 
 * Wraps everything in CourseProvider so pages can set context that Header consumes.
 */
export function DashboardContent({
  children,
  dueTestsCount,
  defaultCourseContext,
  headerStats,
}: DashboardContentProps) {
  const pathname = usePathname();
  
  // Study and Test modes have their own layout with Sidebar and custom Navbar
  const isStudyMode = pathname.includes("/study");
  const isTestMode = pathname.includes("/test");
  if (isStudyMode || isTestMode) {
    // Study/Test mode handles its own header and sidebar via their Client component
    // Still wrap in CourseProvider for consistency
    return (
      <CourseProvider>
        <DefaultContextSetter context={defaultCourseContext} />
        {children}
      </CourseProvider>
    );
  }
  
  // At top-level dashboard and courses page, no sidebar
  const showSidebar = pathname !== "/dashboard" && !pathname.startsWith("/courses/");
  
  if (!showSidebar) {
    // No sidebar - full width content with fixed header; only main scrolls
    return (
      <CourseProvider>
        <DefaultContextSetter context={defaultCourseContext} />
        <Header showSidebar={false} stats={headerStats} />
        <div className="h-screen overflow-hidden pt-[72px]">
          <main className="bg-background h-full overflow-auto px-6 pt-[8px] pb-6 md:px-10 md:pt-[8px] md:pb-10 lg:px-[60px] lg:pt-[8px] lg:pb-[60px]">
            {children}
          </main>
        </div>
      </CourseProvider>
    );
  }

  // With sidebar - fixed header, sidebar and main; only main scrolls
  return (
    <CourseProvider>
      <DefaultContextSetter context={defaultCourseContext} />
      <Header showSidebar={true} stats={headerStats} />
      <Sidebar dueTestsCount={dueTestsCount} />
      <div className="h-screen overflow-hidden pt-[72px]">
        <main className="bg-background ml-[240px] h-full overflow-auto px-6 pt-[8px] pb-6 md:px-10 md:pt-[8px] md:pb-10 lg:px-[60px] lg:pt-[8px] lg:pb-[60px]">
          {children}
        </main>
      </div>
    </CourseProvider>
  );
}
