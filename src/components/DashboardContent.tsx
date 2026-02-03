"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CourseProvider } from "@/context/CourseContext";

interface DashboardContentProps {
  children: React.ReactNode;
  dueTestsCount?: number;
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
}: DashboardContentProps) {
  const pathname = usePathname();
  
  // Study and Test modes have their own layout with Sidebar and custom Navbar
  const isStudyMode = pathname.includes("/study");
  const isTestMode = pathname.includes("/test");
  if (isStudyMode || isTestMode) {
    // Study/Test mode handles its own header and sidebar via their Client component
    // Still wrap in CourseProvider for consistency
    return <CourseProvider>{children}</CourseProvider>;
  }
  
  // At top-level dashboard and courses page, no sidebar
  const showSidebar = pathname !== "/dashboard" && !pathname.startsWith("/courses/");
  
  if (!showSidebar) {
    // No sidebar - full width content with header
    return (
      <CourseProvider>
        <Header showSidebar={false} />
        <div className="pt-[72px]">
          <main className="bg-background min-h-[calc(100vh-72px)] overflow-auto px-[60px] py-[60px]">
            <div className="max-w-content-lg mx-auto">{children}</div>
          </main>
        </div>
      </CourseProvider>
    );
  }
  
  // With sidebar - header full width at top, sidebar + content below
  return (
    <CourseProvider>
      {/* Header - full width at top */}
      <Header showSidebar={true} />
      
      {/* Sidebar - starts below header */}
      <Sidebar dueTestsCount={dueTestsCount} />
      
      {/* Main content - offset by header height and sidebar width */}
      <main className="bg-background ml-[240px] min-h-[calc(100vh-72px)] overflow-auto pt-[72px] px-[60px] py-[60px]">
        <div className="max-w-content-lg mx-auto">{children}</div>
      </main>
    </CourseProvider>
  );
}
