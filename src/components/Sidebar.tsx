"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BookMarked,
  Users,
  Trophy,
  Lock,
  Gift,
  Settings,
  HelpCircle,
} from "lucide-react";
import { useCourseContext } from "@/context/CourseContext";
import { Button } from "@/components/ui/button";

// Base nav items - paths are dynamic based on course context
const getNavItems = (courseId?: string) => [
  { path: courseId ? `/course/${courseId}/schedule` : "/schedule", icon: GraduationCap, label: "Schedule" },
  { path: `/course/${courseId || ""}`, icon: BookOpen, label: "Lessons" },
  { path: "/tests", icon: ClipboardCheck, label: "Tests" },
  { path: "/dictionary", icon: BookMarked, label: "Dictionary" },
  { path: "/community", icon: Users, label: "Community" },
  { path: "/trophies", icon: Trophy, label: "Trophies" },
];

const bottomNavItems = [
  { path: "/referrals", icon: Gift, label: "Referrals" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  badge?: number;
}

function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isActive = false,
  badge,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      className={`flex h-12 w-full items-center justify-between rounded-[10px] transition-all ${
        isActive ? "bg-secondary" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3 pl-4">
        <Icon
          className="h-5 w-5 shrink-0"
          strokeWidth={1.67}
          style={{ color: isActive ? "#101828" : "#4A5565" }}
        />
        <span
          className="text-[15px] font-semibold leading-[1.35] tracking-[-0.225px]"
          style={{ color: isActive ? "#101828" : "rgba(20,21,21,0.75)" }}
        >
          {label}
        </span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="mr-4 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function SidebarButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button className="flex h-12 w-full items-center rounded-[10px] transition-all hover:bg-gray-50">
      <div className="flex items-center gap-3 pl-4">
        <Icon
          className="h-5 w-5 shrink-0"
          strokeWidth={1.67}
          style={{ color: "rgba(20,21,21,0.75)" }}
        />
        <span
          className="text-[15px] font-semibold leading-[1.35] tracking-[-0.225px]"
          style={{ color: "rgba(20,21,21,0.75)" }}
        >
          {label}
        </span>
      </div>
    </button>
  );
}

interface SidebarProps {
  dueTestsCount?: number;
}

export function Sidebar({ dueTestsCount: propDueTestsCount }: SidebarProps) {
  const pathname = usePathname();
  const { courseId, dueTestsCount: contextDueTestsCount } = useCourseContext();

  // Prefer prop (from layout) over context (from page)
  const dueTestsCount = propDueTestsCount ?? contextDueTestsCount;

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    // For schedule, match /schedule or /course/[id]/schedule
    if (path.includes("/schedule")) {
      return pathname === "/schedule" || pathname.endsWith("/schedule");
    }
    // For lessons, match /course/[id] (but not /course/[id]/schedule) and /lesson routes
    if (path.startsWith("/course/") && !path.includes("/schedule")) {
      const isSchedulePage = pathname.endsWith("/schedule");
      return !isSchedulePage && (pathname.includes("/lesson") || pathname.includes("/course/"));
    }
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <div className="fixed top-[72px] bottom-0 left-0 flex w-[240px] flex-col bg-white">
      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-4 pt-4">
        {getNavItems(courseId).map((item) => (
          <SidebarNavItem
            key={item.label}
            href={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.path)}
            badge={item.label === "Tests" ? dueTestsCount : undefined}
          />
        ))}
      </nav>

      {/* Unlock Card */}
      <div className="mx-4 mb-4 rounded-2xl bg-gray-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lock className="h-5 w-5 text-warning" strokeWidth={1.67} />
          <span className="text-[15px] font-semibold text-foreground">
            Unlock All Lessons
          </span>
        </div>
        <p className="mb-3 text-[13px] leading-[1.4] text-muted-foreground">
          First 10 lessons free. Subscribe for all 20 lessons.
        </p>
        <Button
          className="w-full bg-warning hover:bg-warning/90 text-white"
          size="sm"
        >
          View Plans
        </Button>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-1 px-4 pb-5">
        {bottomNavItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            href={item.path}
            icon={item.icon}
            label={item.label}
          />
        ))}
        <SidebarButton icon={HelpCircle} label="Help" />
      </div>
    </div>
  );
}
