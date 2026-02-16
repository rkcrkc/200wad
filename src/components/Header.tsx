"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, UserCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useCourseContext } from "@/context/CourseContext";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showSidebar?: boolean;
}

export function Header({ showSidebar = true }: HeaderProps) {
  const { user, isLoading, isGuest } = useUser();
  const pathname = usePathname();
  const { languageFlag, languageId, courseId, courseName } = useCourseContext();

  // Determine if we have a course context to show
  const hasContext = languageFlag && courseId && courseName;

  // Determine if we're inside a course (course pages, lesson pages)
  const isInsideCourse = pathname.startsWith("/course/") || pathname.startsWith("/lesson/");

  // Course selector routing:
  // - Inside course → go to language courses list (browse other courses)
  // - Outside course → go to current course schedule (jump to course dashboard)
  const courseSelectorHref = (() => {
    if (!courseId) return "/dashboard";
    if (isInsideCourse && languageId) {
      return `/courses/${languageId}`;
    }
    return `/course/${courseId}/schedule`;
  })();

  // Get user initials for avatar
  const getUserInitial = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  // Header is always full-width fixed at top
  const headerClasses = "fixed top-0 left-0 right-0 z-20 h-[72px] bg-white py-2 px-4";

  return (
    <header className={headerClasses}>
      <div className="flex h-full w-full items-center justify-between">
        {/* Left side - Logo + Navigation */}
        <div className="flex shrink-0 items-center pr-4">
          {/* Logo / Course Selector - matches sidebar width and button alignment */}
          <div className="-ml-4 flex w-[240px] shrink-0 px-4">
            <Link
              href={courseSelectorHref}
              className="flex h-12 w-full items-center rounded-[10px] transition-all hover:bg-gray-50"
            >
              <div className="flex h-full min-w-0 items-center gap-3 pl-4">
                {/* Logo Icon or Language Flag */}
                {hasContext ? (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center text-[22px]">
                    {languageFlag}
                  </div>
                ) : (
                  <div className="bg-primary relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                    <span className="text-sm font-bold text-white">W</span>
                  </div>
                )}
                {/* Title */}
                <div className="flex min-w-0 flex-col">
                  <span className="text-muted-foreground text-[11px] leading-[1.35] font-medium tracking-[-0.275px]">
                    {isGuest ? "Welcome to" : "Learning"}
                  </span>
                  <span className="text-foreground truncate text-[15px] leading-[1.35] font-semibold tracking-[-0.225px]">
                    {hasContext ? courseName : "200 Words a Day"}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Back/Forward Navigation - Only when logged in */}
          {!isGuest && (
            <div className="flex h-9 w-20 shrink-0 items-center gap-2">
              <button
                onClick={() => window.history.back()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-all hover:bg-gray-50"
                title="Go back"
              >
                <ChevronLeft className="text-muted-foreground h-5 w-5" strokeWidth={1.67} />
              </button>
              <button
                onClick={() => window.history.forward()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-all hover:bg-gray-50"
                title="Go forward"
              >
                <ChevronRight className="text-muted-foreground h-5 w-5" strokeWidth={1.67} />
              </button>
            </div>
          )}

          {/* Search Bar - Only when sidebar is shown and logged in */}
          {showSidebar && !isGuest && (
            <div className="relative ml-5 h-[42px] w-[400px] shrink-0">
              <div className="border-secondary bg-input-background absolute top-0 left-0 h-[42px] w-full rounded-[10px] border">
                <input
                  type="text"
                  placeholder="Search words, lessons or help"
                  className="text-foreground placeholder:text-muted-foreground focus:ring-primary h-full w-full rounded-[inherit] bg-transparent py-2 pr-4 pl-10 text-[15px] leading-[1.35] font-medium tracking-[-0.3px] focus:ring-2 focus:outline-none"
                />
              </div>
              <div className="pointer-events-none absolute top-[9px] left-3">
                <Search className="text-muted-foreground h-5 w-5" />
              </div>
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className={`flex shrink-0 items-center gap-4 ${!showSidebar ? "ml-auto" : ""}`}>
          {isLoading ? (
            // Loading skeleton
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : isGuest ? (
            // Guest state - Sign In / Sign Up buttons
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          ) : (
            // Logged in state
            <>
              {/* Notification Bell */}
              <button className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-all hover:bg-gray-50">
                <Bell className="text-muted-foreground h-5 w-5" strokeWidth={1.67} />
                {/* Notification badge */}
                <div className="bg-destructive absolute top-1 right-1 h-2 w-2 rounded-full" />
              </button>

              {/* User Account Button */}
              <Link
                href="/settings"
                className="flex h-12 shrink-0 items-center gap-2 rounded-[10px] px-3 transition-all hover:bg-gray-50"
              >
                {/* Avatar with gradient */}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #2b7fff 0%, #ad46ff 100%)",
                  }}
                >
                  <span className="text-sm leading-5 font-normal tracking-[-0.15px] text-white">
                    {getUserInitial()}
                  </span>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
