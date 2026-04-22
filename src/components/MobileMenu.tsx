"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, X } from "lucide-react";
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BookMarked,
  Lock,
  Gift,
  Settings,
  HelpCircle,
} from "lucide-react";
import { useCourseContext } from "@/context/CourseContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { Button } from "@/components/ui/button";

// Base nav items - paths are dynamic based on course context
const getNavItems = (courseId?: string) => [
  { path: courseId ? `/course/${courseId}/schedule` : "/schedule", icon: GraduationCap, label: "Schedule" },
  { path: `/course/${courseId || ""}`, icon: BookOpen, label: "Lessons" },
  { path: courseId ? `/course/${courseId}/tests` : "/tests", icon: ClipboardCheck, label: "Tests" },
  { path: courseId ? `/course/${courseId}/dictionary` : "/dictionary", icon: BookMarked, label: "Dictionary" },
];

const bottomNavItems = [
  { path: "/referrals", icon: Gift, label: "Referrals" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

interface MobileNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  badge?: number;
  onClick: () => void;
}

function MobileNavItem({
  href,
  icon: Icon,
  label,
  isActive = false,
  badge,
  onClick,
}: MobileNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
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

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  dueTestsCount?: number;
  onViewPlans?: () => void;
  freeLessons?: number;
}

export function MobileMenu({ isOpen, onClose, dueTestsCount, onViewPlans, freeLessons = 10 }: MobileMenuProps) {
  const pathname = usePathname();
  const { courseId, languageId } = useCourseContext();
  const { hasLanguageAccess, hasAllLanguagesAccess, accessEndDate } = useSubscription();

  const showUpgradeCard = !hasAllLanguagesAccess && !(languageId && hasLanguageAccess(languageId));
  const endDate = languageId ? accessEndDate(languageId) : null;

  // Close menu on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (path.includes("/schedule")) {
      return pathname === "/schedule" || pathname.endsWith("/schedule");
    }
    if (path.includes("/tests")) {
      return pathname === "/tests" || pathname.endsWith("/tests");
    }
    if (path.includes("/dictionary")) {
      return pathname === "/dictionary" || pathname.endsWith("/dictionary");
    }
    if (path.startsWith("/course/") && !path.includes("/schedule") && !path.includes("/tests") && !path.includes("/dictionary")) {
      const isSchedulePage = pathname.endsWith("/schedule");
      const isTestsPage = pathname.endsWith("/tests");
      const isDictionaryPage = pathname.endsWith("/dictionary");
      return !isSchedulePage && !isTestsPage && !isDictionaryPage && (pathname.includes("/lesson") || pathname.includes("/course/"));
    }
    return pathname === path || pathname.startsWith(path);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-white shadow-xl transition-transform lg:hidden">
        {/* Header */}
        <div className="flex h-[72px] items-center justify-between border-b border-gray-100 px-4">
          <span className="text-lg font-semibold text-foreground">Menu</span>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all hover:bg-gray-50"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-4 pt-4">
          {getNavItems(courseId).map((item) => (
            <MobileNavItem
              key={item.label}
              href={item.path}
              icon={item.icon}
              label={item.label}
              isActive={isActive(item.path)}
              badge={item.label === "Tests" ? dueTestsCount : undefined}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Unlock Card */}
        {showUpgradeCard && (
          <div className="mx-4 my-4 rounded-2xl bg-bone p-4">
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
              onClick={() => {
                onClose();
                onViewPlans?.();
              }}
            >
              View Plans
            </Button>
          </div>
        )}

        {/* Subscription ending warning */}
        {!showUpgradeCard && endDate && (
          <div className="mx-4 my-4 rounded-2xl bg-orange-50 p-4">
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
            <MobileNavItem
              key={item.path}
              href={item.path}
              icon={item.icon}
              label={item.label}
              onClick={onClose}
            />
          ))}
          <button
            onClick={onClose}
            className="flex h-12 w-full items-center rounded-[10px] transition-all hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 pl-4">
              <HelpCircle
                className="h-5 w-5 shrink-0"
                strokeWidth={1.67}
                style={{ color: "rgba(20,21,21,0.75)" }}
              />
              <span
                className="text-[15px] font-semibold leading-[1.35] tracking-[-0.225px]"
                style={{ color: "rgba(20,21,21,0.75)" }}
              >
                Help
              </span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
