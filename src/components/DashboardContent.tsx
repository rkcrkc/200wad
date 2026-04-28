"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { UpgradeModal } from "./UpgradeModal";
import { EmailVerificationReminder } from "./auth/EmailVerificationReminder";
import { CourseProvider, useCourseContext, useSetCourseContext } from "@/context/CourseContext";
import { SubscriptionProvider, type SimpleSubscription } from "@/context/SubscriptionContext";
import { TextProvider } from "@/context/TextContext";
import { WordPreviewProvider } from "@/context/WordPreviewContext";
import type { PricingPlan } from "@/types/database";
import type { SubscriptionDisplayInfo } from "@/lib/queries/subscriptionInfo";

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
  wordsMastered?: number;
  totalWords?: number;
  totalWordsStudied?: number;
  totalTimeSeconds?: number;
  studyTimeSeconds?: number;
  testTimeSeconds?: number;
  leaderboardRank?: number | null;
}

interface DashboardContentProps {
  children: React.ReactNode;
  dueTestsCount?: number;
  defaultCourseContext?: DefaultCourseContext;
  headerStats?: HeaderStats;
  /** Show logged-in UI preview for guests during onboarding */
  showPreviewMode?: boolean;
  plans?: PricingPlan[];
  enabledTiers?: string[];
  textOverrides?: Record<string, string>;
  subscriptions?: SimpleSubscription[];
  displayInfo?: SubscriptionDisplayInfo;
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
 * Renders the UpgradeModal inside CourseProvider so it can read language context.
 */
function UpgradeModalWithContext({
  isOpen,
  onClose,
  plans,
  enabledTiers,
  freeLessons,
}: {
  isOpen: boolean;
  onClose: () => void;
  plans: PricingPlan[];
  enabledTiers: string[];
  freeLessons?: number;
}) {
  const { languageName, languageFlag, languageId } = useCourseContext();

  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={onClose}
      languageName={languageName}
      languageFlag={languageFlag}
      languageId={languageId}
      plans={plans}
      enabledTiers={enabledTiers}
      freeLessons={freeLessons}
    />
  );
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
  showPreviewMode,
  plans = [],
  enabledTiers = [],
  textOverrides = {},
  subscriptions = [],
  displayInfo,
}: DashboardContentProps) {
  const pathname = usePathname();

  // Auto-open the upgrade modal once for users who just signed up and don't yet
  // have any active subscription. The "just_signed_up" flag is set by OnboardingModal
  // after a successful signup; we consume it on the very first render here.
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    if (subscriptions.some((s) => s.isEffective)) return false;
    if (plans.length === 0) return false;
    if (localStorage.getItem("just_signed_up") !== "1") return false;
    localStorage.removeItem("just_signed_up");
    return true;
  });

  const handleViewPlans = useCallback(() => {
    setUpgradeModalOpen(true);
  }, []);

  const handleCloseUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
  }, []);

  // Study and Test modes have their own layout with Sidebar and custom Navbar
  // Note: /test matches the test-taking mode at /lesson/[id]/test, not /tests or /course/[id]/tests
  const isStudyMode = pathname.includes("/study");
  const isTestMode = pathname.endsWith("/test");
  if (isStudyMode || isTestMode) {
    // Study/Test mode handles its own header and sidebar via their Client component
    // Still wrap in CourseProvider for consistency
    return (
      <CourseProvider>
        <SubscriptionProvider subscriptions={subscriptions}>
          <TextProvider overrides={textOverrides}>
            <DefaultContextSetter context={defaultCourseContext} />
            {children}
          </TextProvider>
        </SubscriptionProvider>
      </CourseProvider>
    );
  }

  // At top-level dashboard and courses page, no sidebar
  const showSidebar = pathname !== "/dashboard" && !pathname.startsWith("/courses/");

  if (!showSidebar) {
    // No sidebar - full width content with fixed header; only main scrolls
    return (
      <CourseProvider>
        <SubscriptionProvider subscriptions={subscriptions}>
          <TextProvider overrides={textOverrides}>
            <WordPreviewProvider>
              <DefaultContextSetter context={defaultCourseContext} />
              <Header showSidebar={false} stats={headerStats} showPreviewMode={showPreviewMode} />
              <div className="h-screen overflow-visible pt-[72px]">
                <main className="bg-background h-full overflow-auto px-4 pt-[8px] pb-6 md:px-8 lg:px-[60px] lg:pb-10">
                  {children}
                </main>
              </div>
              {!showPreviewMode && <EmailVerificationReminder />}
            </WordPreviewProvider>
          </TextProvider>
        </SubscriptionProvider>
      </CourseProvider>
    );
  }

  // With sidebar - fixed header, sidebar and main; only main scrolls
  return (
    <CourseProvider>
      <SubscriptionProvider subscriptions={subscriptions}>
        <TextProvider overrides={textOverrides}>
          <WordPreviewProvider>
            <DefaultContextSetter context={defaultCourseContext} />
            <Header showSidebar={true} stats={headerStats} showPreviewMode={showPreviewMode} dueTestsCount={dueTestsCount} onViewPlans={handleViewPlans} freeLessons={displayInfo?.freeLessons} />
            <Sidebar dueTestsCount={dueTestsCount} onViewPlans={handleViewPlans} freeLessons={displayInfo?.freeLessons} />
            <div className="h-screen overflow-visible pt-[72px]">
              <main className="bg-background h-full overflow-auto px-4 pt-[8px] pb-6 md:px-8 lg:ml-[240px] lg:px-10 lg:pb-10">
                {children}
              </main>
            </div>
            <UpgradeModalWithContext
              isOpen={upgradeModalOpen}
              onClose={handleCloseUpgradeModal}
              plans={plans}
              enabledTiers={enabledTiers}
              freeLessons={displayInfo?.freeLessons}
            />
            {!showPreviewMode && <EmailVerificationReminder />}
          </WordPreviewProvider>
        </TextProvider>
      </SubscriptionProvider>
    </CourseProvider>
  );
}
