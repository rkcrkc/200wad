"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, ClipboardCheck, ArrowRight, type LucideIcon } from "lucide-react";
import { LessonStartTestModal } from "@/components/study";
import { useCourseContext } from "@/context/CourseContext";
import { useHeaderStats } from "@/context/HeaderStatsContext";
import type { ContinueItem } from "@/lib/queries/schedule";

export type { ContinueItem };

/**
 * Mobile-only floating bottom navigation, rendered globally by DashboardContent
 * on every dashboard page. Four tabs: Home, Lessons, Tests, and Continue — the
 * last deep-links into the current scheduler item (Study for a lesson, or the
 * test-start modal for a due test).
 *
 * `courseId` comes from CourseContext (set per-course by the layout) and the
 * `continueItem` target streams in via the header-stats bundle, so the bar is
 * self-sufficient and needs no props. Hidden when there's no current course
 * (e.g. a logged-in user mid-onboarding) since its tabs are course-scoped, and
 * on the lesson detail page (/lesson/<id>), which runs its own focused layout.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { courseId } = useCourseContext();
  const { continueItem } = useHeaderStats();
  const [showStartTestModal, setShowStartTestModal] = useState(false);

  if (!courseId) return null;

  // Suppress the global tab bar on the lesson detail page — it has its own
  // full-bleed layout and CTAs. Matches only /lesson/<id>; the /study and /test
  // sub-flows already opt out upstream in DashboardContent.
  if (/^\/lesson\/[^/]+$/.test(pathname)) return null;

  // Also suppress it during the subscriptions/checkout flow: that page runs its
  // own fixed CheckoutFooterBar at the bottom edge, so a competing tab bar just
  // clutters a focused, transactional screen.
  if (pathname === "/account/subscriptions") return null;

  const homeHref = `/course/${courseId}/schedule`;
  const lessonsHref = `/course/${courseId}`;
  const testsHref = `/course/${courseId}/tests`;

  const isHome = pathname.endsWith("/schedule");
  const isLessons = pathname === lessonsHref;
  const isTests = pathname.endsWith("/tests");

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-gray-100 bg-white shadow-[0_-8px_24px_-6px_rgba(0,0,0,0.18)] md:hidden"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        <NavTab href={homeHref} icon={Home} label="Home" isActive={isHome} />
        <NavTab href={lessonsHref} icon={BookOpen} label="Lessons" isActive={isLessons} />
        <NavTab href={testsHref} icon={ClipboardCheck} label="Tests" isActive={isTests} />

        {continueItem &&
          (continueItem.mode === "lesson" ? (
            <NavTab
              href={`/lesson/${continueItem.lessonId}/study`}
              icon={ArrowRight}
              label="Next"
            />
          ) : (
            <NavTab
              icon={ArrowRight}
              label="Next"
              onClick={() => setShowStartTestModal(true)}
            />
          ))}
      </nav>

      {continueItem && continueItem.mode === "test" && showStartTestModal && (
        <LessonStartTestModal
          lessonId={continueItem.lessonId}
          lessonTitle={continueItem.title}
          wordCount={continueItem.wordCount}
          milestone={continueItem.milestone ?? null}
          onCancel={() => setShowStartTestModal(false)}
        />
      )}
    </>
  );
}

interface NavTabProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
}

function NavTab({ icon: Icon, label, href, isActive = false, onClick }: NavTabProps) {
  const color = isActive ? "text-foreground" : "text-gray-mid";

  const inner = (
    <>
      <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2 : 1.67} />
      <span className="text-xs-medium" style={isActive ? { fontWeight: 600 } : undefined}>
        {label}
      </span>
    </>
  );

  const className = `flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5 transition-colors ${color}`;

  if (href) {
    return (
      <Link href={href} prefetch className={className} aria-current={isActive ? "page" : undefined}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
