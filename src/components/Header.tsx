"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, Medal, Menu, TrendingUp } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { useUser } from "@/context/UserContext";
import { useCourseContext } from "@/context/CourseContext";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { MobileMenu } from "./MobileMenu";
import type { HeaderStats } from "./DashboardContent";

/** Format seconds as hours with 1 decimal place */
function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours < 0.1 ? "0 hours" : `${hours.toFixed(1)} hours`;
}

interface HeaderProps {
  showSidebar?: boolean;
  stats?: HeaderStats;
  /** Show full logged-in UI for guests during onboarding (with placeholder values) */
  showPreviewMode?: boolean;
  /** Due tests count for mobile menu badge */
  dueTestsCount?: number;
  /** Callback to open the upgrade modal */
  onViewPlans?: () => void;
}

// Placeholder stats for onboarding preview
const PREVIEW_STATS: HeaderStats = {
  courseProgressPercent: 12,
  wordsPerDay: 24,
  wordsMastered: 24,
  totalWords: 200,
  totalWordsStudied: 48,
  totalTimeSeconds: 3600, // 1 hour
  leaderboardRank: 42,
};

export function Header({ showSidebar = true, stats, showPreviewMode = false, dueTestsCount, onViewPlans }: HeaderProps) {
  const { user, isLoading, isGuest, isAdmin } = useUser();
  const pathname = usePathname();
  const { languageFlag, languageId, courseId, courseName } = useCourseContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCloseMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // In preview mode, treat guest as logged in for UI purposes
  const showAsLoggedIn = !isGuest || showPreviewMode;
  const effectiveStats = showPreviewMode && isGuest ? PREVIEW_STATS : stats;

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

  // Header is always full-width fixed at top so it stays visible when content scrolls
  const headerClasses = "fixed top-0 left-0 right-0 z-20 h-[72px] bg-white py-2 px-4";

  return (
    <>
      <header className={headerClasses}>
        <div className="flex h-full w-full items-center justify-between">
          {/* Left side - Logo + Navigation */}
          <div className="flex shrink-0 items-center pr-4">
            {/* Hamburger menu - show on small/md when sidebar would be shown */}
            {showSidebar && showAsLoggedIn && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-all hover:bg-gray-50 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 text-muted-foreground" />
              </button>
            )}

            {/* Logo / Course Selector - smaller on mobile, full width on lg */}
            <div className="-ml-4 flex w-auto shrink-0 px-4 lg:w-[240px]">
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
                    {showAsLoggedIn ? "Learning" : "Welcome to"}
                  </span>
                  <span className="text-foreground truncate text-[15px] leading-[1.35] font-semibold tracking-[-0.225px]">
                    {hasContext ? courseName : "200 Words a Day"}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Back/Forward Navigation - Show when logged in, hide on small screens */}
          {showAsLoggedIn && (
            <div className="hidden h-9 w-20 shrink-0 items-center gap-2 md:flex">
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

          {/* Stats Indicators - Course Progress & Words/Day - hide on small screens */}
          {showAsLoggedIn && effectiveStats && hasContext && (
            <div className="ml-4 hidden shrink-0 items-center gap-5 md:flex">
              {/* Course Progress Indicator */}
              <Popover
                className="flex flex-col cursor-default"
                content={
                  <span className="text-foreground text-[14px] leading-[1.4] font-medium">
                    {effectiveStats.wordsMastered} of {effectiveStats.totalWords} words mastered ({effectiveStats.totalWords && effectiveStats.totalWords > 0 ? ((effectiveStats.wordsMastered ?? 0) / effectiveStats.totalWords * 100).toFixed(1) : 0}%)
                  </span>
                }
              >
                <span className="text-foreground text-[14px] leading-[1.35] font-semibold tracking-[-0.14px]">
                  {effectiveStats.courseProgressPercent}% complete
                </span>
                <div className="mt-1 h-1.5 w-[100px] overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="bg-success h-full rounded-full transition-all duration-300"
                    style={{ width: `${effectiveStats.courseProgressPercent}%` }}
                  />
                </div>
              </Popover>

              {/* Words Per Day Indicator */}
              <Popover
                className="flex flex-col items-center"
                content={(() => {
                  const words = effectiveStats.totalWordsStudied ?? 0;
                  const hours = (effectiveStats.totalTimeSeconds ?? 0) / 3600;
                  const perHour = hours > 0 ? (words / hours) : 0;
                  const perHourDisplay = perHour.toFixed(1);
                  return (
                    <div className="flex flex-col gap-1">
                      <span className="text-foreground text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
                        Words per day rate
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground text-[13px] leading-[1.4] whitespace-nowrap">
                          {words} words studied ÷ {formatHours(effectiveStats.totalTimeSeconds ?? 0)} total time = <span className="font-semibold">{perHourDisplay} words/hour</span>
                        </span>
                        <span className="text-foreground text-[13px] leading-[1.4] whitespace-nowrap">
                          {perHourDisplay} words/hour × 8-hour day = <span className="font-semibold">{effectiveStats.wordsPerDay} words/day</span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              >
                <div className="flex items-center gap-1">
                  <span className="text-foreground text-[20px] leading-[1.2] font-semibold tracking-[-0.2px]">
                    {effectiveStats.wordsPerDay}
                  </span>
                  <TrendingUp className="text-success h-4 w-4" strokeWidth={2} />
                </div>
                <span className="text-muted-foreground text-[11px] leading-[1.35] font-medium tracking-[-0.11px]">
                  words/day
                </span>
              </Popover>

              {/* Leaderboard Rank Indicator */}
              {effectiveStats.leaderboardRank != null && effectiveStats.leaderboardRank > 0 && (
                <Link href="/community" className="flex flex-col items-center transition-opacity hover:opacity-70">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground text-[20px] leading-[1.2] font-semibold tracking-[-0.2px]">
                      #{effectiveStats.leaderboardRank}
                    </span>
                    <Medal className="text-warning h-4 w-4" strokeWidth={2} />
                  </div>
                  <span className="text-muted-foreground text-[11px] leading-[1.35] font-medium tracking-[-0.11px]">
                    rank
                  </span>
                </Link>
              )}
            </div>
          )}

          {/* Search Bar - Show when sidebar is shown and logged in, hide on small/md */}
          {showSidebar && showAsLoggedIn && <SearchBar />}
        </div>

        {/* Right side - Actions */}
        <div className={`flex shrink-0 items-center gap-4 ${!showSidebar ? "ml-auto" : ""}`}>
          {isLoading ? (
            // Loading skeleton
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : isGuest && !showPreviewMode ? (
            // Guest state (no preview) - Sign In / Sign Up buttons
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
            // Logged in state (or preview mode)
            <>
              {/* Admin Button - Only show for admins */}
              {isAdmin && (
                <Link href="/admin">
                  <Button size="sm">
                    Admin →
                  </Button>
                </Link>
              )}

              {/* Notification Bell */}
              <button className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-all hover:bg-gray-50">
                <Bell className="text-muted-foreground h-5 w-5" strokeWidth={1.67} />
                {/* Notification badge */}
                <div className="bg-destructive absolute top-1 right-1 h-2 w-2 rounded-full" />
              </button>

              {/* User Account Button */}
              <Link
                href={isGuest ? "#" : "/settings"}
                className="flex h-12 shrink-0 items-center gap-2 rounded-[10px] px-3 transition-all hover:bg-gray-50"
                onClick={isGuest ? (e) => e.preventDefault() : undefined}
              >
                {/* Avatar with gradient */}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #2b7fff 0%, #ad46ff 100%)",
                  }}
                >
                  <span className="text-sm leading-5 font-normal tracking-[-0.15px] text-white">
                    {isGuest ? "?" : getUserInitial()}
                  </span>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>

    {/* Mobile Menu */}
    {showSidebar && (
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={handleCloseMobileMenu}
        dueTestsCount={dueTestsCount}
        onViewPlans={onViewPlans}
      />
    )}
    </>
  );
}
