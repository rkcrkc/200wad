"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BookMarked,
  LineChart,
  Trophy,
  Flame,
  Lock,
  Coins,
  ShoppingBag,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Podium } from "@/components/ui/podium-icon";
import { useCourseContext } from "@/context/CourseContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useHeaderStats } from "@/context/HeaderStatsContext";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

// Base nav items - paths are dynamic based on course context
const getNavItems = (courseId?: string) => [
  { path: courseId ? `/course/${courseId}/schedule` : "/schedule", icon: GraduationCap, label: "Schedule" },
  { path: `/course/${courseId || ""}`, icon: BookOpen, label: "Lessons" },
  { path: courseId ? `/course/${courseId}/tests` : "/tests", icon: ClipboardCheck, label: "Tests" },
  { path: courseId ? `/course/${courseId}/dictionary` : "/dictionary", icon: BookMarked, label: "Dictionary" },
  { path: courseId ? `/course/${courseId}/progress` : "/progress", icon: LineChart, label: "Progress" },
];

const getSecondaryNavItems = () => [
  { path: "/community", icon: Podium, label: "Leaderboard" },
  { path: "/trophies", icon: Trophy, label: "Trophies" },
  { path: "/streak", icon: Flame, label: "Streaks" },
  { path: "/shop", icon: ShoppingBag, label: "Shop" },
];

const bottomNavItems = [
  { path: "/referrals", icon: Coins, label: "Credits" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  badge?: number;
  /**
   * Pre-formatted badge label (e.g. "#24"). Takes precedence over `badge` when
   * provided and is rendered verbatim, so callers can prefix or format the
   * value however they need.
   */
  badgeText?: string;
  /**
   * Drops the badge's filled pill background, rendering the value as plain
   * text. Used for the Streaks/Leaderboard rows where the count reads as a
   * subtle label rather than a notification pill.
   */
  badgeUnfilled?: boolean;
  /** Collapsed sidebar: icon only, label/badge hidden, tooltip on hover */
  collapsed?: boolean;
}

function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isActive = false,
  badge,
  badgeText,
  badgeUnfilled = false,
  collapsed = false,
}: SidebarNavItemProps) {
  const showBadge =
    badgeText !== undefined && badgeText !== ""
      ? true
      : badge !== undefined && badge > 0;
  const badgeContent = badgeText !== undefined && badgeText !== "" ? badgeText : badge;

  if (collapsed) {
    return (
      <Tooltip label={label} position="right">
        <Link
          href={href}
          prefetch
          aria-label={label}
          className={`flex h-12 w-full items-center justify-center rounded-[10px] transition-all ${
            isActive ? "bg-secondary" : "hover:bg-bone-hover"
          }`}
        >
          <Icon
            className={`h-5 w-5 shrink-0 ${isActive ? "text-gray-dark" : "text-gray-mid"}`}
            strokeWidth={1.67}
          />
        </Link>
      </Tooltip>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      className={`flex h-12 w-full items-center justify-between rounded-[10px] transition-all ${
        isActive ? "bg-secondary" : "hover:bg-bone-hover"
      }`}
    >
      <div className="flex items-center gap-3 pl-4">
        <Icon
          className={`h-5 w-5 shrink-0 ${isActive ? "text-gray-dark" : "text-gray-mid"}`}
          strokeWidth={1.67}
        />
        <span
          className={`text-[15px] font-semibold leading-[1.35] tracking-[-0.225px] ${isActive ? "text-gray-dark" : "text-black-75"}`}
        >
          {label}
        </span>
      </div>
      {showBadge && (
        <span
          className={`mr-4 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
            badgeUnfilled ? "text-gray-mid" : "bg-beige text-foreground"
          }`}
        >
          {badgeContent}
        </span>
      )}
    </Link>
  );
}

interface SidebarProps {
  dueTestsCount?: number;
  onViewPlans?: () => void;
  freeLessons?: number;
  /** Collapse to an icon-only rail */
  collapsed?: boolean;
}

export function Sidebar({ dueTestsCount: propDueTestsCount, onViewPlans, freeLessons = 10, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { courseId, languageId, dueTestsCount: contextDueTestsCount } = useCourseContext();
  const { hasLanguageAccess, hasAllLanguagesAccess, accessEndDate } = useSubscription();
  const { stats: headerStats } = useHeaderStats();

  // Prefer the course-scoped context value (set by the course layout against the
  // URL courseId) over the streamed prop, which is computed against the persisted
  // current_course_id and can be stale on first visit to a course. Fall back to
  // the prop on non-course pages where context isn't populated.
  const dueTestsCount = contextDueTestsCount ?? propDueTestsCount;

  // Leaderboard rank badge — formatted as "#24". `undefined` (stats not yet
  // streamed) and null/0 (no rank) both hide the badge.
  const leaderboardBadge =
    headerStats?.leaderboardRank != null && headerStats.leaderboardRank > 0
      ? `#${headerStats.leaderboardRank}`
      : undefined;

  // Streak badge — raw day count. `undefined` while stats stream and `0`
  // (no live streak) both suppress the badge so the row stays clean.
  const streakBadge =
    headerStats?.currentStreak && headerStats.currentStreak > 0
      ? headerStats.currentStreak
      : undefined;

  const showUpgradeCard = !hasAllLanguagesAccess && !(languageId && hasLanguageAccess(languageId));
  const endDate = languageId ? accessEndDate(languageId) : null;

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    // For schedule, match /schedule or /course/[id]/schedule
    if (path.includes("/schedule")) {
      return pathname === "/schedule" || pathname.endsWith("/schedule");
    }
    // For tests, match /tests or /course/[id]/tests
    if (path.includes("/tests")) {
      return pathname === "/tests" || pathname.endsWith("/tests");
    }
    // For dictionary, match /dictionary or /course/[id]/dictionary
    if (path.includes("/dictionary")) {
      return pathname === "/dictionary" || pathname.endsWith("/dictionary");
    }
    // For progress, match /progress or /course/[id]/progress
    if (path.includes("/progress")) {
      return pathname === "/progress" || pathname.endsWith("/progress");
    }
    // For community (the leaderboard sidebar entry points here)
    if (path === "/community") {
      return pathname === "/community" || pathname.startsWith("/community");
    }
    // For streaks
    if (path === "/streak") {
      return pathname === "/streak" || pathname.startsWith("/streak");
    }
    // For trophies
    if (path === "/trophies") {
      return pathname === "/trophies" || pathname.startsWith("/trophies");
    }
    // For shop
    if (path === "/shop") {
      return pathname === "/shop" || pathname.startsWith("/shop");
    }
    // For lessons, match /course/[id] (but not /course/[id]/schedule, /tests, /dictionary, or /progress) and /lesson routes
    if (path.startsWith("/course/") && !path.includes("/schedule") && !path.includes("/tests") && !path.includes("/dictionary") && !path.includes("/progress")) {
      const isSchedulePage = pathname.endsWith("/schedule");
      const isTestsPage = pathname.endsWith("/tests");
      const isDictionaryPage = pathname.endsWith("/dictionary");
      const isProgressPage = pathname.endsWith("/progress");
      return !isSchedulePage && !isTestsPage && !isDictionaryPage && !isProgressPage && (pathname.includes("/lesson") || pathname.includes("/course/"));
    }
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <div
      className={`fixed top-[72px] bottom-0 left-0 hidden flex-col bg-white lg:flex ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-4 pt-2">
        {getNavItems(courseId).map((item) => (
          <SidebarNavItem
            key={item.label}
            href={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.path)}
            badge={item.label === "Tests" ? dueTestsCount : undefined}
            collapsed={collapsed}
          />
        ))}
        <div className="my-2 h-px bg-gray-100" role="separator" />
        {getSecondaryNavItems().map((item) => (
          <SidebarNavItem
            key={item.label}
            href={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.path)}
            badge={item.label === "Streaks" ? streakBadge : undefined}
            badgeText={item.label === "Leaderboard" ? leaderboardBadge : undefined}
            badgeUnfilled={item.label === "Streaks" || item.label === "Leaderboard"}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Unlock Card */}
      {!collapsed && showUpgradeCard && (
        <div className="mx-4 mb-4 rounded-2xl bg-bone p-4">
          <div className="mb-2 flex items-center gap-2">
            <Lock className="h-5 w-5 text-warning" strokeWidth={1.67} />
            <span className="text-[15px] font-semibold text-foreground">
              Unlock All Lessons
            </span>
          </div>
          <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
            First {freeLessons} lessons free. Subscribe for full access.
          </p>
          <Button
            className="w-full bg-warning hover:bg-warning/90 text-white"
            size="sm"
            onClick={onViewPlans}
          >
            View Plans
          </Button>
        </div>
      )}

      {/* Subscription ending warning */}
      {!collapsed && !showUpgradeCard && endDate && (
        <div className="mx-4 mb-4 rounded-2xl bg-orange-50 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Lock className="h-5 w-5 text-orange-500" strokeWidth={1.67} />
            <span className="text-[15px] font-semibold text-foreground">
              Access Ending
            </span>
          </div>
          <p className="text-[13px] leading-[1.4] text-muted-foreground">
            Your subscription ends{" "}
            {new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
          </p>
        </div>
      )}

      {/* Bottom Section */}
      <div className="flex flex-col gap-1 px-4 pb-5">
        {bottomNavItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            href={item.path}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
          />
        ))}
        <SidebarNavItem href="/help" icon={HelpCircle} label="Help" collapsed={collapsed} />
      </div>
    </div>
  );
}
