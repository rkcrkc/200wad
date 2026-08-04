"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./schedule/MobileBottomNav";
import { UpgradeModal, type UpgradeLanguageOption } from "./UpgradeModal";
import { EmailVerificationReminder } from "./auth/EmailVerificationReminder";
import { CourseProvider, useCourseContext, useSetCourseContext } from "@/context/CourseContext";
import { SubscriptionProvider, type SimpleSubscription } from "@/context/SubscriptionContext";
import { TextProvider } from "@/context/TextContext";
import { WordPreviewProvider } from "@/context/WordPreviewContext";
import { UpgradeModalProvider } from "@/context/UpgradeModalContext";
import { StudyExitGuardProvider } from "@/context/StudyExitGuardContext";
import { SidebarCollapseProvider } from "@/context/SidebarCollapseContext";
import {
  HeaderStatsProvider,
  useHeaderStats,
  type HeaderStatsBundle,
} from "@/context/HeaderStatsContext";
import type { PricingPlan } from "@/types/database";
import type { PricingTierCopyMap } from "@/lib/queries/subscriptions";
import type { SubscriptionDisplayInfo } from "@/lib/queries/subscriptionInfo";
import type { DailyGoalProgress } from "@/lib/queries/daily-goal";

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
  totalWordsLearned?: number;
  totalTimeSeconds?: number;
  studyTimeSeconds?: number;
  testTimeSeconds?: number;
  leaderboardRank?: number | null;
  /**
   * Effective current streak — matches the value rendered on `/streak`. Drives
   * the sidebar Streaks badge.
   */
  currentStreak?: number;
  /**
   * Today's XP-goal progress (goal, todayXp, percent, goalMet). Undefined
   * until the streamed stats bundle resolves; renders the header ring once
   * present.
   */
  dailyGoal?: DailyGoalProgress;
}

interface DashboardContentProps {
  children: React.ReactNode;
  defaultCourseContext?: DefaultCourseContext;
  /** Flags of every visible language, for the header's empty-state picker. */
  languageFlags?: string[];
  /**
   * Streamed bundle of slow header stats + due-tests count. Resolved
   * asynchronously inside a Suspense boundary so the shell renders before
   * these aggregation queries finish.
   */
  headerStatsPromise?: Promise<HeaderStatsBundle> | null;
  /** Show logged-in UI preview for guests during onboarding */
  showPreviewMode?: boolean;
  plans?: PricingPlan[];
  enabledTiers?: string[];
  /** Admin-editable upgrade-modal card copy keyed by tier. */
  pricingCopy?: PricingTierCopyMap;
  /** Not-yet-unlocked languages for the global upgrade modal's picker. */
  upgradeLanguages?: UpgradeLanguageOption[];
  /** Language pre-selected in the picker (defaults to the current course's). */
  upgradeDefaultLanguageId?: string;
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
  copy,
  languages,
  defaultLanguageId,
}: {
  isOpen: boolean;
  onClose: () => void;
  plans: PricingPlan[];
  enabledTiers: string[];
  freeLessons?: number;
  copy?: PricingTierCopyMap;
  languages?: UpgradeLanguageOption[];
  defaultLanguageId?: string;
}) {
  const { languageName, languageFlag, languageId } = useCourseContext();
  // Seed the picker with the current course's language when it's selectable,
  // otherwise the layout-provided default (first available language).
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    () =>
      (languageId && languages?.some((l) => l.id === languageId)
        ? languageId
        : defaultLanguageId) ?? null
  );

  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={onClose}
      languageName={languageName}
      languageFlag={languageFlag}
      languageId={languageId}
      languages={languages}
      selectedLanguageId={selectedLanguageId}
      onSelectLanguage={setSelectedLanguageId}
      plans={plans}
      enabledTiers={enabledTiers}
      freeLessons={freeLessons}
      copy={copy}
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
  defaultCourseContext,
  languageFlags,
  headerStatsPromise,
  showPreviewMode,
  plans = [],
  enabledTiers = [],
  pricingCopy,
  upgradeLanguages,
  upgradeDefaultLanguageId,
  textOverrides = {},
  subscriptions = [],
  displayInfo,
}: DashboardContentProps) {
  return (
    <HeaderStatsProvider promise={headerStatsPromise ?? null}>
      <DashboardShell
        defaultCourseContext={defaultCourseContext}
        languageFlags={languageFlags}
        showPreviewMode={showPreviewMode}
        plans={plans}
        enabledTiers={enabledTiers}
        pricingCopy={pricingCopy}
        upgradeLanguages={upgradeLanguages}
        upgradeDefaultLanguageId={upgradeDefaultLanguageId}
        textOverrides={textOverrides}
        subscriptions={subscriptions}
        displayInfo={displayInfo}
      >
        {children}
      </DashboardShell>
    </HeaderStatsProvider>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  defaultCourseContext?: DefaultCourseContext;
  languageFlags?: string[];
  showPreviewMode?: boolean;
  plans: PricingPlan[];
  enabledTiers: string[];
  pricingCopy?: PricingTierCopyMap;
  upgradeLanguages?: UpgradeLanguageOption[];
  upgradeDefaultLanguageId?: string;
  textOverrides: Record<string, string>;
  subscriptions: SimpleSubscription[];
  displayInfo?: SubscriptionDisplayInfo;
}

function DashboardShell({
  children,
  defaultCourseContext,
  languageFlags,
  showPreviewMode,
  plans,
  enabledTiers,
  pricingCopy,
  upgradeLanguages,
  upgradeDefaultLanguageId,
  textOverrides,
  subscriptions,
  displayInfo,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { stats: streamedStats, dueTestsCount: streamedDueTestsCount } =
    useHeaderStats();

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

  // Desktop sidebar collapse state — persisted across reloads/sessions.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "1";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

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
    // Still wrap in CourseProvider for consistency.
    // WordPreviewProvider is required here because the study/test clients use
    // `useWordPreview()` to open related words from the side panel.
    return (
      <CourseProvider>
        <SubscriptionProvider subscriptions={subscriptions}>
          <TextProvider overrides={textOverrides}>
            <StudyExitGuardProvider>
              <WordPreviewProvider>
                <DefaultContextSetter context={defaultCourseContext} />
                {children}
              </WordPreviewProvider>
            </StudyExitGuardProvider>
          </TextProvider>
        </SubscriptionProvider>
      </CourseProvider>
    );
  }

  // Courses page renders full width; everything else gets the sidebar.
  const showSidebar = !pathname.startsWith("/courses/");

  // Header positioning: in the app (logged in) the navbar stays `fixed` at all
  // sizes, so content sits below it via pt-[72px]. During guest/onboarding
  // preview the navbar is in normal flow on mobile (it scrolls as a page
  // header), so the content area takes the remaining height instead; md+ still
  // reverts to the fixed-header layout. See Header.tsx headerClasses.
  const contentWrapperClass = showPreviewMode
    ? "h-[calc(100dvh-72px)] overflow-visible md:h-screen md:pt-[72px]"
    : "h-dvh overflow-visible pt-[72px]";

  if (!showSidebar) {
    // No sidebar - full width content with fixed header; only main scrolls
    return (
      <CourseProvider>
        <SubscriptionProvider subscriptions={subscriptions}>
          <TextProvider overrides={textOverrides}>
            <WordPreviewProvider>
              <DefaultContextSetter context={defaultCourseContext} />
              <Header showSidebar={false} stats={streamedStats} showPreviewMode={showPreviewMode} languageFlags={languageFlags} />
              <div className={contentWrapperClass}>
                <main className="bg-background h-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-[8px] pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-6 lg:px-[60px] lg:pb-10">
                  {children}
                </main>
              </div>
              {!showPreviewMode && <MobileBottomNav />}
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
          <UpgradeModalProvider openUpgradeModal={handleViewPlans}>
            <SidebarCollapseProvider collapsed={sidebarCollapsed}>
              <WordPreviewProvider>
                <DefaultContextSetter context={defaultCourseContext} />
                <Header showSidebar={true} stats={streamedStats} showPreviewMode={showPreviewMode} dueTestsCount={streamedDueTestsCount} onViewPlans={handleViewPlans} freeLessons={displayInfo?.freeLessons} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={handleToggleSidebar} languageFlags={languageFlags} />
                <Sidebar dueTestsCount={streamedDueTestsCount} onViewPlans={handleViewPlans} freeLessons={displayInfo?.freeLessons} collapsed={sidebarCollapsed} />
                <div className={contentWrapperClass}>
                  <main className={`bg-background h-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-[8px] pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-6 lg:px-10 lg:pb-10 ${sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]"}`}>
                    {children}
                  </main>
                </div>
                {!showPreviewMode && <MobileBottomNav />}
                <UpgradeModalWithContext
                  isOpen={upgradeModalOpen}
                  onClose={handleCloseUpgradeModal}
                  plans={plans}
                  enabledTiers={enabledTiers}
                  freeLessons={displayInfo?.freeLessons}
                  copy={pricingCopy}
                  languages={upgradeLanguages}
                  defaultLanguageId={upgradeDefaultLanguageId}
                />
                {!showPreviewMode && <EmailVerificationReminder />}
              </WordPreviewProvider>
            </SidebarCollapseProvider>
          </UpgradeModalProvider>
        </TextProvider>
      </SubscriptionProvider>
    </CourseProvider>
  );
}
