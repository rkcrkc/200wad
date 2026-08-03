"use client";

import { useState, useRef, useEffect, Suspense, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Menu } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StatusPill } from "@/components/ui/status-pill";
import { XpBadge } from "@/components/ui/xp-badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Badge } from "@/components/ui/badge";
import { SubBadge } from "@/components/ui/sub-badge";
import { CourseLevelBadge } from "@/components/ui/course-level-badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SchedulerCard } from "@/components/schedule/SchedulerCard";
import { SchedulerSection } from "@/components/schedule/SchedulerSection";
import { LessonGridSection } from "@/components/schedule/LessonGridSection";
import { LessonPreviewCard } from "@/components/schedule/LessonPreviewCard";
import { ScrollablePills } from "@/components/schedule/ScrollablePills";
import { PageShell } from "@/components/PageShell";
import { PageContainer } from "@/components/PageContainer";
import { PageTopBar } from "@/components/PageTopBar";
import { DesktopOnly } from "@/components/DesktopOnly";
import { MobileFloatingBar } from "@/components/ui/MobileFloatingBar";
import { InlineSearch } from "@/components/InlineSearch";
import { Popover } from "@/components/ui/popover";
import { CourseStatsBar } from "@/components/CourseStatsBar";
import { SpecialLessonsRow } from "@/components/lessons/SpecialLessonsRow";
import { LessonsList } from "@/components/LessonsList";
import { TestsList } from "@/components/TestsList";
import { CategoryFilter, type CategoryOption } from "@/components/CategoryFilter";
import { DictionaryList } from "@/components/DictionaryList";
import { WordsList } from "@/components/WordsList";
import { WordCard } from "@/components/WordCard";
import { WordGrid } from "@/components/study/WordGrid";
import { WordDetailSidebar } from "@/components/WordDetailSidebar";
import { StudyNavbar, StudyProgressBar, StudyActionBar, StudyWordListSidebar, StudySidebar, AnswerInput, TestAnswerInput, InformationNextButton, LessonCompletedModal, TestCompletedModal, StartTestModal, type TestWordResult, type TestAnswerResult } from "@/components/study";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { LanguageSubscriptionsList } from "@/components/subscriptions/LanguageSubscriptionsList";
import { CheckoutFooterBar } from "@/components/subscriptions/CheckoutFooterBar";
import type { UserSettings } from "@/lib/queries/settings";
import type { SubscriptionLanguage, LanguageCourse } from "@/lib/queries/subscriptions";
import type { UpgradeTarget } from "@/components/subscriptions/planCopy";
import type { PricingPlan } from "@/types/database";
import type { ExampleSentence, Lesson } from "@/types/database";
import { WordPreviewProvider } from "@/context/WordPreviewContext";
import { MobileStatsDropdown } from "@/components/ui/mobile-stats-dropdown";
import type { LessonForScheduler } from "@/lib/queries/schedule";
import type { LessonWithProgress } from "@/lib/queries/lessons";
import type { TestForList } from "@/lib/queries/tests";
import type { DictionaryWord } from "@/lib/queries/dictionary";
import type { WordWithDetails } from "@/lib/queries/words";
import type { LanguageGreetings } from "@/types/database";

/**
 * "App UI" — an internal, admin-only catalog of the shared UI building blocks
 * reused across the app. Each entry shows the live component, its source path,
 * and where it's used, so mobile/design passes can fix a component once rather
 * than hunting it down per page.
 *
 * Sections are split into top tabs. Only the shared design-system primitives
 * are populated for now; the page-composition and feature-block sections are
 * filled in incrementally as we work through each page's mobile pass.
 *
 * Instance locations are hand-maintained for now (a dynamic importer scan is
 * planned so the "Used in" lists can't drift out of date).
 */

type SectionId = "primitives" | "scaffolding" | "features";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "primitives", label: "Primitives" },
  { id: "scaffolding", label: "Page scaffolding" },
  { id: "features", label: "Feature blocks" },
];

export function AppUiCatalog() {
  const [activeTab, setActiveTab] = useState<SectionId>("primitives");

  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">App UI</h1>
        <p className="mt-1 text-sm text-gray-500">
          Catalog of shared UI components — live render, source path, and where
          each is used. Instance locations are hand-maintained for now.
        </p>
      </header>

      <div className="mb-8">
        <Tabs
          tabs={SECTIONS}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as SectionId)}
        />
      </div>

      {activeTab === "primitives" && <PrimitivesSection />}
      {activeTab === "scaffolding" && <ScaffoldingSection />}
      {activeTab === "features" && <FeaturesSection />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function PrimitivesSection() {
  return (
    <div className="space-y-6">
      <Entry
        name="Button"
        source="src/components/ui/button.tsx"
        usedIn={[
          "Everywhere — PageHeader actions",
          "SchedulerSection / LessonGridSection ('All …' links)",
          "Admin pages",
        ]}
      >
        <Swatch label="variant=default">
          <Button>Continue</Button>
        </Swatch>
        <Swatch label="variant=secondary">
          <Button variant="secondary">Secondary</Button>
        </Swatch>
        <Swatch label="variant=outline">
          <Button variant="outline">Outline</Button>
        </Swatch>
        <Swatch label="variant=ghost">
          <Button variant="ghost">Ghost</Button>
        </Swatch>
        <Swatch label="variant=destructive">
          <Button variant="destructive">Delete</Button>
        </Swatch>
        <Swatch label="variant=link">
          <Button variant="link">Link</Button>
        </Swatch>
        <Swatch label="size=sm">
          <Button size="sm">Small</Button>
        </Swatch>
        <Swatch label="size=lg">
          <Button size="lg">Large</Button>
        </Swatch>
      </Entry>

      <Entry
        name="PrimaryButton"
        source="src/components/ui/primary-button.tsx"
        usedIn={[
          "SchedulerCard (Start test / Study lesson)",
          "Onboarding & signup flows",
          "Checkout footer",
        ]}
      >
        <Swatch label="variant=primary">
          <PrimaryButton>Start test</PrimaryButton>
        </Swatch>
        <Swatch label="variant=outline">
          <PrimaryButton variant="outline">Maybe later</PrimaryButton>
        </Swatch>
      </Entry>

      <Entry
        name="StatusPill"
        source="src/components/ui/status-pill.tsx"
        usedIn={[
          "SchedulerCard",
          "LessonPreviewCard",
          "Course & lesson listings",
        ]}
      >
        <Swatch label="mastered">
          <StatusPill status="mastered" />
        </Swatch>
        <Swatch label="learned">
          <StatusPill status="learned" />
        </Swatch>
        <Swatch label="learning">
          <StatusPill status="learning" />
        </Swatch>
        <Swatch label="notStarted">
          <StatusPill status="notStarted" />
        </Swatch>
        <Swatch label="locked">
          <StatusPill status="locked" />
        </Swatch>
        <Swatch label="size=sm · mastered">
          <StatusPill status="mastered" size="sm" />
        </Swatch>
        <Swatch label="size=sm · learning">
          <StatusPill status="learning" size="sm" />
        </Swatch>
        <Swatch label="size=sm · notStarted">
          <StatusPill status="notStarted" size="sm" />
        </Swatch>
        <Swatch label="variant=inline">
          <StatusPill status="mastered" variant="inline" />
        </Swatch>
      </Entry>

      <Entry
        name="XpBadge"
        source="src/components/ui/xp-badge.tsx"
        usedIn={[
          "SchedulerCard (XP-available chip)",
          "Test results",
          "Header / stats readouts",
        ]}
      >
        <Swatch label="available">
          <XpBadge value={51} />
        </Swatch>
        <Swatch label="available-blue">
          <XpBadge value={51} variant="available-blue" />
        </Swatch>
        <Swatch label="earned">
          <XpBadge value={48} variant="earned" showPlus />
        </Swatch>
        <Swatch label="on-primary" dark>
          <XpBadge value={51} variant="on-primary" />
        </Swatch>
        <Swatch label="on-primary-subtle · xs" dark>
          <XpBadge value={126} variant="on-primary-subtle" size="xs" />
        </Swatch>
        <Swatch label="default">
          <XpBadge value={120} variant="default" />
        </Swatch>
        <Swatch label="size=xs · available">
          <XpBadge value={36} size="xs" />
        </Swatch>
        <Swatch label="size=md · available">
          <XpBadge value={51} size="md" />
        </Swatch>
      </Entry>

      <Entry
        name="ProgressRing"
        source="src/components/ui/progress-ring.tsx"
        usedIn={["LanguageCardStack", "Header progress", "Course cards"]}
      >
        <Swatch label="0%">
          <ProgressRing value={0} size={44} showValue />
        </Swatch>
        <Swatch label="35%">
          <ProgressRing value={35} size={44} showValue />
        </Swatch>
        <Swatch label="100%">
          <ProgressRing value={100} size={44} showValue />
        </Swatch>
      </Entry>

      <Entry
        name="Badge"
        source="src/components/ui/badge.tsx"
        usedIn={["Admin tables", "Inline status labels"]}
      >
        <Swatch label="default">
          <Badge>Default</Badge>
        </Swatch>
        <Swatch label="success">
          <Badge variant="success">Published</Badge>
        </Swatch>
        <Swatch label="warning">
          <Badge variant="warning">Draft</Badge>
        </Swatch>
        <Swatch label="outline">
          <Badge variant="outline">Outline</Badge>
        </Swatch>
        <Swatch label="beige">
          <Badge variant="beige">Beige</Badge>
        </Swatch>
      </Entry>

      <Entry
        name="CourseLevelBadge"
        source="src/components/ui/course-level-badge.tsx"
        usedIn={["Courses grid", "CourseAccordionCard"]}
      >
        <Swatch label="beginner">
          <CourseLevelBadge level="beginner" />
        </Swatch>
        <Swatch label="intermediate + CEFR">
          <CourseLevelBadge level="intermediate" cefrRange="A2–B1" />
        </Swatch>
        <Swatch label="advanced">
          <CourseLevelBadge level="advanced" />
        </Swatch>
      </Entry>

      <Entry
        name="SubBadge"
        source="src/components/ui/sub-badge.tsx"
        usedIn={["Data tables (row + header counts)"]}
      >
        <Swatch label="variant=row">
          <SubBadge>12</SubBadge>
        </Swatch>
        <Swatch label="variant=header">
          <SubBadge variant="header">Total</SubBadge>
        </Swatch>
      </Entry>

      <Entry
        name="Switch"
        source="src/components/ui/switch.tsx"
        usedIn={["Settings toggles", "Admin feature flags"]}
      >
        <Swatch label="interactive">
          <SwitchDemo />
        </Swatch>
      </Entry>

      <Entry
        name="Input"
        source="src/components/ui/input.tsx"
        usedIn={["Auth & signup forms", "Admin editors", "Search"]}
      >
        <Swatch label="default" grow>
          <Input placeholder="you@example.com" />
        </Swatch>
        <Swatch label="disabled" grow>
          <Input placeholder="Disabled" disabled />
        </Swatch>
      </Entry>

      <Entry
        name="Tabs"
        source="src/components/ui/tabs.tsx"
        usedIn={["LessonGridSection filters", "Admin list filters", "This page"]}
      >
        <Swatch label="interactive" grow>
          <TabsDemo />
        </Swatch>
      </Entry>

      <Entry
        name="InlineSearch"
        source="src/components/InlineSearch.tsx"
        usedIn={["LessonsList (All Lessons filter)"]}
      >
        <Swatch label="click the icon to expand" grow>
          <InlineSearchDemo />
        </Swatch>
      </Entry>

      <Entry
        name="CategoryFilter"
        source="src/components/CategoryFilter.tsx"
        usedIn={["DictionaryList (filter words by category)"]}
      >
        <Swatch label="click the funnel — multi-select + count badge">
          <CategoryFilterDemo />
        </Swatch>
      </Entry>

      <Entry
        name="Popover"
        source="src/components/ui/popover.tsx"
        usedIn={[
          "CourseStatsBar (desktop per-stat breakdowns)",
          "Time / mastery stat readouts",
        ]}
      >
        <Swatch label="hover the value">
          <Popover
            content={
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold leading-[1.4] text-foreground">
                  Words learned
                </span>
                <span className="text-[13px] leading-[1.4] text-foreground">
                  <span className="font-semibold">128</span> learned /{" "}
                  <span className="font-semibold">200</span> total = 64.0%
                </span>
              </div>
            }
          >
            <span className="cursor-default text-regular-semibold underline decoration-dotted underline-offset-2">
              128 / 200
            </span>
          </Popover>
        </Swatch>
      </Entry>

      <Entry
        name="Tooltip"
        source="src/components/ui/tooltip.tsx"
        usedIn={["PageTopBar width toggle", "SchedulerCard action buttons"]}
      >
        <Swatch label="hover me">
          <Tooltip label="Expand page width" position="below">
            <Button variant="ghost" size="sm">
              Hover
            </Button>
          </Tooltip>
        </Swatch>
      </Entry>

      <Entry
        name="EmptyState"
        source="src/components/ui/empty-state.tsx"
        usedIn={["Schedule (no lessons)", "LessonGridSection tabs"]}
      >
        <Swatch grow>
          <EmptyState
            title="Nothing to review right now"
            description="You're all caught up. Come back later for review suggestions."
          />
        </Swatch>
      </Entry>

      <Entry
        name="Skeleton"
        source="src/components/ui/skeleton.tsx"
        usedIn={["Loading states across pages"]}
      >
        <Swatch grow>
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </Swatch>
      </Entry>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page scaffolding
// ---------------------------------------------------------------------------

function ScaffoldingSection() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Structural wrappers that give every page its width, top padding, greeting
        row and width toggle. Rendered live below with sample data — the previews
        are bounded to this catalog column, so widths read narrower than a real
        page.
      </p>

      <DescEntry
        name="PageShell"
        source="src/components/PageShell.tsx"
        description="Top-level page wrapper: composes PageContainer + PageTopBar and reads the persisted page width from usePageWidth(). Almost every dashboard page renders its content inside a PageShell."
        props={[
          "backLink?: { href, label }",
          "greetings?, greetingUserName?, initialTimeOfDay?",
          "withTopPadding?: boolean",
          "className?, children",
        ]}
        usedIn={[
          "Schedule (withTopPadding=false)",
          "Courses / dashboard",
          "Settings, Profile, Referrals",
        ]}
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop">
              <PageShell
                greetings={MOCK_GREETINGS}
                greetingUserName="Ryan"
                withTopPadding={false}
              >
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400">
                  page content
                </div>
              </PageShell>
            </PreviewVariant>
            <PreviewVariant label="mobile (width toggle hidden)">
              <MobileFrame>
                <PageShell
                  greetings={MOCK_GREETINGS}
                  greetingUserName="Ryan"
                  withTopPadding={false}
                >
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400">
                    page content
                  </div>
                </PageShell>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="PageContainer"
        source="src/components/PageContainer.tsx"
        description="Centres content and controls max-width via a size token (sm / ms / md / lg → max-w-content-*), animating width changes. Owns the default top padding (pt-8) when withTopPadding is set."
        props={[
          'size: "sm" | "ms" | "md" | "lg"',
          "withTopPadding?: boolean",
          "className?, children",
        ]}
        usedIn={["Inside PageShell", "Standalone on a few bespoke pages"]}
        preview={
          <div className="space-y-4">
            {(
              [
                { size: "sm", px: "840px" },
                { size: "ms", px: "960px" },
                { size: "md", px: "1080px" },
                { size: "lg", px: "1280px" },
              ] as const
            ).map(({ size, px }) => (
              <PreviewVariant key={size} label={`size="${size}" · max-w-content-${size} (${px})`}>
                <PageContainer
                  size={size}
                  withTopPadding={false}
                  className="rounded-lg bg-primary/5 p-3"
                >
                  <p className="text-center text-xs text-gray-500">centered</p>
                </PageContainer>
              </PreviewVariant>
            ))}
          </div>
        }
      />

      <DescEntry
        name="PageTopBar"
        source="src/components/PageTopBar.tsx"
        description="The row above page content: a time-of-day greeting (with optional translation tooltip) or a back link on the left, and the desktop width-toggle button on the right. Toggle below is live and local to this preview."
        props={[
          "backLink?, greetings?, greetingUserName?, initialTimeOfDay?",
          'width: "md" | "lg", onToggleWidth, mounted',
        ]}
        usedIn={["Rendered by PageShell on every shell page"]}
        mobileNote="Width toggle is hidden on mobile; when it's the only content (no greeting / back link) the whole row is hidden — so the toggle-only variant renders nothing below 768px."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · greeting mode (toggle width is live)">
              <PageTopBarDemo />
            </PreviewVariant>
            <PreviewVariant label="desktop · backLink mode">
              <PageTopBar
                backLink={{ href: "#", label: "Back to courses" }}
                width="md"
                onToggleWidth={() => {}}
                mounted
              />
            </PreviewVariant>
            <PreviewVariant label="desktop · width toggle only (no greeting / back link)">
              <PageTopBar width="md" onToggleWidth={() => {}} mounted />
            </PreviewVariant>
            <PreviewVariant label="mobile · toggle hidden; toggle-only row collapses to nothing">
              <MobileFrame>
                <div className="space-y-3">
                  <PageTopBar
                    greetings={MOCK_GREETINGS}
                    greetingUserName="Ryan"
                    width="md"
                    onToggleWidth={() => {}}
                    mounted
                  />
                  <PageTopBar
                    backLink={{ href: "#", label: "Back to courses" }}
                    width="md"
                    onToggleWidth={() => {}}
                    mounted
                  />
                  {/* Toggle-only bar — renders nothing at this width */}
                  <PageTopBar width="md" onToggleWidth={() => {}} mounted />
                  <p className="text-xs text-muted-foreground">
                    (a toggle-only bar sits above this line — hidden on mobile)
                  </p>
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="MobileFloatingBar"
        source="src/components/ui/MobileFloatingBar.tsx"
        description="Docks a single primary action to the viewport bottom on mobile (portalled to body to survive the scrolling <main>), and renders it inline in normal flow on desktop. The preview shows the desktop/in-flow form; narrow the window below 768px to see it dock."
        props={["children (action content)", "className?"]}
        usedIn={["Mobile primary actions across flows"]}
        mobileNote="Mobile-only docking; on desktop it's ordinary in-flow content. Publishes --floating-bar-h so pages can reserve clearance."
        preview={
          <MobileFloatingBar>
            <PrimaryButton className="w-full">Primary action</PrimaryButton>
          </MobileFloatingBar>
        }
      />

      <DescEntry
        name="DesktopOnly"
        source="src/components/DesktopOnly.tsx"
        description="Gates a whole page behind the desktop breakpoint. Below md it hides its children and shows a short 'not available on mobile' message; at md and up the wrapper collapses (md:contents) so children lay out exactly as if it weren't there. CSS-only, so server pages render it without a hydration flash."
        props={["children"]}
        usedIn={[
          "Leaderboard / Community",
          "Trophies",
          "Streaks",
          "Shop",
        ]}
        mobileNote="Full block below 768px. Progress uses a lighter variant of the same idea — it keeps its four summary cards (stacked) and wraps only the chart + heatmap in hidden md:block."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · children pass through (md:contents)">
              <DesktopOnly>
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400">
                  page content
                </div>
              </DesktopOnly>
            </PreviewVariant>
            <PreviewVariant label="mobile · unavailable message">
              <MobileFrame>
                <DesktopOnly>
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400">
                    page content
                  </div>
                </DesktopOnly>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />
    </div>
  );
}

// Sample per-language greetings so PageShell / PageTopBar render a real
// greeting row. Cast to the DB type — only the time-of-day text/translation
// fields are read here.
const MOCK_GREETINGS = {
  morning: { text: "Buongiorno", translation: "Good morning" },
  afternoon: { text: "Buon pomeriggio", translation: "Good afternoon" },
  evening: { text: "Buonasera", translation: "Good evening" },
} as unknown as LanguageGreetings;

function PageTopBarDemo() {
  const [width, setWidth] = useState<"md" | "lg">("md");
  return (
    <PageTopBar
      greetings={MOCK_GREETINGS}
      greetingUserName="Ryan"
      width={width}
      onToggleWidth={() => setWidth((w) => (w === "md" ? "lg" : "md"))}
      mounted
    />
  );
}

/** A single labelled variant inside a multi-variant preview frame. */
function PreviewVariant({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <code className="text-[11px] text-gray-400">{label}</code>
      <div>{children}</div>
    </div>
  );
}

/**
 * Renders children inside a same-origin iframe sized to a phone width, so
 * viewport media queries (Tailwind `md:` etc.) resolve to their MOBILE branch —
 * something a narrowed <div> can't do, since media queries evaluate against the
 * real viewport, not the container.
 *
 * The app's stylesheets are cloned into the frame so tokens/fonts apply, and
 * children are portalled in — which preserves the React tree, so context
 * (router, TextProvider, etc.) keeps working inside the frame.
 */
function MobileFrame({
  children,
  width = 390,
  flush = false,
  height: fixedHeight,
}: {
  children: ReactNode;
  width?: number;
  /** Drop the inner padding so full-bleed content (e.g. a fixed drawer) sits
   *  flush to the frame edges, matching how it renders on a real viewport. */
  flush?: boolean;
  /** Pin the frame to an explicit height instead of auto-sizing to content.
   *  Needed for full-bleed `position:fixed` content, which doesn't contribute
   *  to scrollHeight and so can't be measured. */
  height?: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [autoHeight, setAutoHeight] = useState(320);
  const height = fixedHeight ?? autoHeight;

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    // Clone parent stylesheets (Tailwind + fonts) into the frame.
    document
      .querySelectorAll('style, link[rel="stylesheet"]')
      .forEach((node) => {
        const clone = node.cloneNode(true);
        if (clone instanceof HTMLLinkElement && node instanceof HTMLLinkElement) {
          clone.href = node.href; // resolve to absolute for the frame's base URL
        }
        doc.head.appendChild(clone);
      });
    // Mirror the parent <html> classes so the next/font CSS variables
    // (--font-bricolage / --font-inter) resolve inside the frame — otherwise
    // display utilities fall back from Bricolage to Inter.
    doc.documentElement.className = document.documentElement.className;
    doc.body.style.margin = "0";
    doc.documentElement.style.colorScheme = "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal the portal target once the frame's document exists after mount
    setBody(doc.body);
  }, []);

  // Auto-size the frame height to its content (unless an explicit height is set).
  useEffect(() => {
    if (!body || fixedHeight !== undefined) return;
    const update = () => setAutoHeight(body.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(body);
    return () => ro.disconnect();
  }, [body, fixedHeight]);

  return (
    <div
      className="mx-auto overflow-hidden rounded-[1.75rem] border-[6px] border-gray-800"
      style={{ width: width + 12 }}
    >
      <iframe
        ref={iframeRef}
        title="Mobile preview"
        className="block bg-background"
        style={{ width, height, border: 0 }}
      />
      {body &&
        createPortal(
          <div className={flush ? "bg-background" : "bg-background p-3"}>{children}</div>,
          body
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature blocks
// ---------------------------------------------------------------------------

// Realistic sample data so the schedule cards render exactly as they do in the
// app. Cast to LessonForScheduler — the cards only read id/title/number/
// word_count/sampleWords/imageUrl/status/nextMilestone, so a full DB row isn't
// needed for a visual catalog.
const MOCK_LESSON = {
  id: "app-ui-demo-lesson",
  number: 1,
  title: "Greetings & Introductions",
  word_count: 12,
  status: "not-started",
  imageUrl: null,
  sampleWords: [
    "ciao",
    "buongiorno",
    "buonasera",
    "arrivederci",
    "grazie",
    "prego",
    "per favore",
    "scusa",
    "sì",
    "no",
    "come stai",
    "mi chiamo",
  ],
} as unknown as LessonForScheduler;

const MOCK_TEST_LESSON = {
  ...MOCK_LESSON,
  status: "learning",
  nextMilestone: "1-week",
} as unknown as LessonForScheduler;

// A small library of lessons for the grid / section previews.
const MOCK_LESSONS: LessonForScheduler[] = [
  { ...MOCK_LESSON, id: "demo-1", number: 1, title: "Greetings & Introductions" },
  {
    ...MOCK_LESSON,
    id: "demo-2",
    number: 2,
    title: "Numbers & Counting",
    status: "learning",
    sampleWords: ["uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto"],
  },
  {
    ...MOCK_LESSON,
    id: "demo-3",
    number: 3,
    title: "Food & Drink",
    status: "learned",
    sampleWords: ["pane", "acqua", "vino", "caffè", "pasta", "formaggio", "mela"],
  },
  {
    ...MOCK_LESSON,
    id: "demo-4",
    number: 4,
    title: "Days & Months",
    sampleWords: ["lunedì", "martedì", "gennaio", "febbraio", "marzo", "aprile"],
  },
] as unknown as LessonForScheduler[];

const MOCK_DUE_TESTS: LessonForScheduler[] = [
  { ...MOCK_TEST_LESSON, id: "test-1", number: 1, title: "Greetings & Introductions" },
  {
    ...MOCK_TEST_LESSON,
    id: "test-2",
    number: 2,
    title: "Numbers & Counting",
    nextMilestone: "1-month",
  },
] as unknown as LessonForScheduler[];

// Sample lessons for the All Lessons page table. LessonWithProgress extends the
// DB Lesson row; the list/rows only read id/number/title/emoji/status/
// word_count/wordsLearned/wordsMastered/isLocked, so a partial object cast to
// the type is enough for a visual catalog.
const MOCK_LESSONS_WITH_PROGRESS = [
  { id: "all-1", number: 1, title: "Greetings & Introductions", emoji: "👋", status: "mastered", word_count: 12, wordsLearned: 12, wordsMastered: 12, isLocked: false },
  { id: "all-2", number: 2, title: "Numbers & Counting", emoji: "🔢", status: "learned", word_count: 15, wordsLearned: 15, wordsMastered: 8, isLocked: false },
  { id: "all-3", number: 3, title: "Food & Drink", emoji: "🍝", status: "learning", word_count: 18, wordsLearned: 7, wordsMastered: 2, isLocked: false },
  { id: "all-4", number: 4, title: "Days, Months & Telling the Time", emoji: "🗓️", status: "not-started", word_count: 20, wordsLearned: 0, wordsMastered: 0, isLocked: false },
  { id: "all-5", number: 5, title: "Travel & Directions", emoji: "🧭", status: "not-started", word_count: 22, wordsLearned: 0, wordsMastered: 0, isLocked: true },
] as unknown as LessonWithProgress[];

// Auto-lessons for the SpecialLessonsRow. Ids MUST be parseable by
// parseAutoLessonId (`auto-{type}-{courseId}`); word_count drives whether the
// Lost Mastery / Unmastered tiles show (both are hidden at count 0).
const MOCK_AUTO_LESSONS = [
  { id: "auto-lost_mastery-demo", number: 804, title: "Lost Mastery", emoji: "⚠️", status: "learning", word_count: 4, wordsLearned: 4, wordsMastered: 0, isAutoLesson: true },
  { id: "auto-unmastered-demo", number: 803, title: "Unmastered", emoji: "📚", status: "learning", word_count: 9, wordsLearned: 9, wordsMastered: 0, isAutoLesson: true },
  { id: "auto-worst-demo", number: 802, title: "Worst Words", emoji: "🎯", status: "learning", word_count: 10, wordsLearned: 6, wordsMastered: 1, isAutoLesson: true },
  { id: "auto-notes-demo", number: 800, title: "My Notes", emoji: "📝", status: "learning", word_count: 5, wordsLearned: 0, wordsMastered: 0, isAutoLesson: true },
  { id: "auto-best-demo", number: 801, title: "Best Words", emoji: "🏆", status: "mastered", word_count: 10, wordsLearned: 10, wordsMastered: 10, isAutoLesson: true },
] as unknown as LessonWithProgress[];

// Sample rows for the Tests hub table. TestForList carries lesson info plus
// per-test results; the rows only read a subset, so partial objects cast to the
// type are enough for a visual catalog. `dueTests` have no score/pointsEarned
// (not taken yet); `previousTests` do.
// Milestones use the real `next_milestone` values, so the previews show the
// true labels ("1-Quarter" renders as "3-Month"). The first row carries the
// longest milestone and a 3-digit XP value — the widest the mobile sub-row and
// the Start test button ever get, which is the case worth eyeballing.
const MOCK_DUE_TEST_ROWS = [
  { lessonId: "t-1", lessonNumber: 1, lessonTitle: "Greetings & Introductions", lessonEmoji: "👋", lessonWordCount: 42, lessonStatus: "learning", wordsLearned: 7, wordsMastered: 2, completionPercent: 58, milestone: "1-quarter", testNumber: 4, isDue: true, maxPoints: 126 },
  { lessonId: "t-2", lessonNumber: 2, lessonTitle: "Days, Months & Telling the Time", lessonEmoji: "🗓️", lessonWordCount: 20, lessonStatus: "learned", wordsLearned: 20, wordsMastered: 9, completionPercent: 100, milestone: "1-week", testNumber: 3, isDue: true, maxPoints: 60 },
  { lessonId: "t-3", lessonNumber: 3, lessonTitle: "Food & Drink", lessonEmoji: "🍝", lessonWordCount: 18, lessonStatus: "learning", wordsLearned: 6, wordsMastered: 0, completionPercent: 33, milestone: "initial", testNumber: 1, isDue: true, maxPoints: 54 },
] as unknown as TestForList[];

const MOCK_PREVIOUS_TEST_ROWS = [
  { lessonId: "p-1", lessonNumber: 1, lessonTitle: "Greetings & Introductions", lessonEmoji: "👋", lessonWordCount: 42, lessonStatus: "mastered", wordsLearned: 42, wordsMastered: 42, completionPercent: 100, testId: "s-1", milestone: "1-quarter", testNumber: 1, scorePercent: 92, newlyLearned: 4, newlyMastered: 2, pointsEarned: 116, maxPoints: 126 },
  { lessonId: "p-2", lessonNumber: 2, lessonTitle: "Numbers & Counting", lessonEmoji: "🔢", lessonWordCount: 15, lessonStatus: "learned", wordsLearned: 15, wordsMastered: 8, completionPercent: 100, testId: "s-2", milestone: "1-week", testNumber: 2, scorePercent: 64, newlyLearned: 3, newlyMastered: 1, isRetest: true, pointsEarned: 29, maxPoints: 45 },
] as unknown as TestForList[];

// Sample dictionary rows. DictionaryWord is the flat row shape the table reads;
// no cast-through-unknown needed since every field is provided. Statuses span
// all four states so the Learning / Learned / Mastered tabs each have counts,
// and categories/part-of-speech vary so the Word Type column and CategoryFilter
// have something to show. `imageUrl` is null so rows use the 🗣️ fallback tile.
const MOCK_DICTIONARY_WORDS: DictionaryWord[] = [
  { id: "dw-1", english: "hello", headword: "ciao", partOfSpeech: "interjection", category: "word", imageUrl: null, status: "learning", lessonId: "l-1", lessonTitle: "Greetings & Introductions", lessonNumber: 1 },
  { id: "dw-2", english: "goodbye", headword: "arrivederci", partOfSpeech: "interjection", category: "word", imageUrl: null, status: "learning", lessonId: "l-1", lessonTitle: "Greetings & Introductions", lessonNumber: 1 },
  { id: "dw-3", english: "thank you", headword: "grazie", partOfSpeech: "interjection", category: "phrase", imageUrl: null, status: "learned", lessonId: "l-1", lessonTitle: "Greetings & Introductions", lessonNumber: 1 },
  { id: "dw-4", english: "water", headword: "acqua", partOfSpeech: "noun", category: "word", imageUrl: null, status: "mastered", lessonId: "l-3", lessonTitle: "Food & Drink", lessonNumber: 3 },
  { id: "dw-5", english: "bread", headword: "pane", partOfSpeech: "noun", category: "word", imageUrl: null, status: "learned", lessonId: "l-3", lessonTitle: "Food & Drink", lessonNumber: 3 },
  { id: "dw-6", english: "one", headword: "uno", partOfSpeech: "number", category: "word", imageUrl: null, status: "learning", lessonId: "l-2", lessonTitle: "Numbers & Counting", lessonNumber: 2 },
  { id: "dw-7", english: "How are you?", headword: "Come stai?", partOfSpeech: null, category: "sentence", imageUrl: null, status: "not-started", lessonId: "l-1", lessonTitle: "Greetings & Introductions", lessonNumber: 1 },
  { id: "dw-8", english: "Rome is the capital of Italy", headword: "Roma è la capitale d'Italia", partOfSpeech: null, category: "fact", imageUrl: null, status: "not-started", lessonId: "l-4", lessonTitle: "Culture", lessonNumber: 4 },
  { id: "dw-9", english: "please", headword: "per favore", partOfSpeech: "interjection", category: "phrase", imageUrl: null, status: "mastered", lessonId: "l-1", lessonTitle: "Greetings & Introductions", lessonNumber: 1 },
  { id: "dw-10", english: "wine", headword: "vino", partOfSpeech: "noun", category: "word", imageUrl: null, status: "not-started", lessonId: "l-3", lessonTitle: "Food & Drink", lessonNumber: 3 },
];

// `myWords` = rows the user has any progress on (everything except not-started);
// the list derives the Learning / Learned / Mastered tab buckets from status.
const MOCK_DICTIONARY_MY_WORDS = MOCK_DICTIONARY_WORDS.filter(
  (w) => w.status !== "not-started"
);

// A single fully-shaped word for the preview panel. WordWithDetails extends the
// whole DB Word row plus collection fields; WordDetailView reads the collections
// directly (relatedWords.compound.length, exampleSentences, testHistory, tips,
// scoreStats) and null-guards every scalar, so a partial cast-through-unknown is
// safe as long as those collections are present. Media/audio URLs are null so no
// remote image domain or audio file is needed.
const MOCK_WORD_DETAIL = {
  id: "dw-1",
  language_id: "it",
  english: "hello",
  headword: "ciao",
  part_of_speech: "interjection",
  gender: null,
  category: "word",
  notes: null,
  sort_order: 0,
  alternate_answers: [],
  alternate_english_answers: [],
  memory_trigger_text:
    "Picture yourself waving CIAO — 'chow' — as you invite a friend to sit down and eat.",
  memory_trigger_image_url: "/logo-placeholder.svg",
  memory_trigger_video_url: null,
  flashcard_image_url: null,
  image_override_url: null,
  video_override_url: null,
  image_group_id: null,
  audio_url_english: null,
  audio_url_foreign: null,
  audio_url_trigger: null,
  status: "learning",
  progress: null,
  exampleSentences: [],
  relatedWords: { compound: [], sentence: [], grammar: [] },
  testHistory: [],
  scoreStats: { totalPointsEarned: 0, totalMaxPoints: 0, scorePercent: 0, timesTested: 0 },
  tips: [],
} as unknown as WordWithDetails;

// The panel's word-list dropdown only needs id / english / foreign.
const MOCK_WORD_DETAIL_LIST = MOCK_DICTIONARY_WORDS.slice(0, 8).map((w) => ({
  id: w.id,
  english: w.english,
  foreign: w.headword,
}));

// A handful of fully-shaped lesson words for the lesson word-list / card / grid
// previews. Built off MOCK_WORD_DETAIL (the one fully-shaped word) with varied
// status so the filter tabs (Not started / Learning / Learned / Mastered) all
// populate. The image URL points at the local placeholder so no remote domain
// is needed.
const MOCK_LESSON_WORDS = [
  { ...MOCK_WORD_DETAIL, id: "lw-1", english: "hello", headword: "ciao", status: "mastered" },
  { ...MOCK_WORD_DETAIL, id: "lw-2", english: "goodbye", headword: "arrivederci", status: "learned" },
  { ...MOCK_WORD_DETAIL, id: "lw-3", english: "thank you", headword: "grazie", status: "learning" },
  { ...MOCK_WORD_DETAIL, id: "lw-4", english: "please", headword: "per favore", status: "learning" },
  { ...MOCK_WORD_DETAIL, id: "lw-5", english: "water", headword: "acqua", status: "not-started" },
] as unknown as WordWithDetails[];

function FeaturesSection() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Composed blocks grouped by the page they belong to. Cards render live
        with sample data; the section wrappers that fetch/compose them are
        catalogued by role. As each page gets its mobile pass, its blocks land
        here first so we can rework the mobile/tablet variants in isolation.
      </p>

      <PageGroupHeading>Schedule page</PageGroupHeading>

      <Entry
        name="SchedulerCard — lesson mode"
        source="src/components/schedule/SchedulerCard.tsx"
        usedIn={["SchedulerSection (Schedule page hero)"]}
      >
        <Swatch label="desktop" grow>
          <div className="w-full">
            <SchedulerCard lesson={MOCK_LESSON} mode="lesson" />
          </div>
        </Swatch>
        <Swatch label="mobile (type badge replaces status; stacked eyebrow)" grow>
          <MobileFrame>
            <SchedulerCard lesson={MOCK_LESSON} mode="lesson" />
          </MobileFrame>
        </Swatch>
      </Entry>

      <Entry
        name="SchedulerCard — test mode"
        source="src/components/schedule/SchedulerCard.tsx"
        usedIn={["SchedulerSection (when a test is due)"]}
      >
        <Swatch label="desktop" grow>
          <div className="w-full">
            <SchedulerCard lesson={MOCK_TEST_LESSON} mode="test" />
          </div>
        </Swatch>
        <Swatch label="mobile" grow>
          <MobileFrame>
            <SchedulerCard lesson={MOCK_TEST_LESSON} mode="test" />
          </MobileFrame>
        </Swatch>
      </Entry>

      <Entry
        name="LessonPreviewCard"
        source="src/components/schedule/LessonPreviewCard.tsx"
        usedIn={["LessonGridSection grid (Schedule page)"]}
      >
        <Swatch grow>
          <div className="w-full max-w-sm">
            <LessonPreviewCard lesson={MOCK_LESSON} />
          </div>
        </Swatch>
      </Entry>

      <Entry
        name="ScrollablePills + WordTagPill"
        source="src/components/schedule/ScrollablePills.tsx"
        usedIn={["SchedulerCard (rows=3)", "LessonPreviewCard (rows=2)"]}
      >
        <Swatch label="rows=2" grow>
          <div className="w-full max-w-md">
            <ScrollablePills words={MOCK_LESSON.sampleWords} rows={2} />
          </div>
        </Swatch>
        <Swatch label="rows=3" grow>
          <div className="w-full max-w-md">
            <ScrollablePills words={MOCK_LESSON.sampleWords} rows={3} />
          </div>
        </Swatch>
      </Entry>

      <DescEntry
        name="SchedulerSection"
        source="src/components/schedule/SchedulerSection.tsx"
        description="Hero section of the Schedule page. Picks what to surface next (due test → worst-words → next lesson), renders the heading and optional test folder tabs, then a SchedulerCard. Returns null when there's nothing to show."
        props={[
          "dueTests, nextLesson, worstWordsAutoLesson?",
          "isFirstLesson, dueTestsCount, totalLessons",
          "justCompletedTest?, justCompletedLesson?",
        ]}
        usedIn={["Schedule page"]}
        mobileNote="Folder tabs and heading compete for space above the card — candidates to compress on mobile."
        preview={
          <div className="space-y-6">
            <PreviewVariant label="desktop · first lesson (no tests due)">
              <SchedulerSection
                dueTests={[]}
                nextLesson={MOCK_LESSON}
                isFirstLesson
                dueTestsCount={0}
                totalLessons={12}
              />
            </PreviewVariant>
            <PreviewVariant label="desktop · tests due (folder tabs)">
              <SchedulerSection
                dueTests={MOCK_DUE_TESTS}
                nextLesson={null}
                isFirstLesson={false}
                dueTestsCount={MOCK_DUE_TESTS.length}
                totalLessons={12}
              />
            </PreviewVariant>
            <PreviewVariant label="mobile · first lesson">
              <MobileFrame>
                <SchedulerSection
                  dueTests={[]}
                  nextLesson={MOCK_LESSON}
                  isFirstLesson
                  dueTestsCount={0}
                  totalLessons={12}
                />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="LessonGridSection"
        source="src/components/schedule/LessonGridSection.tsx"
        description={
          'Secondary "Or study something else" grid. Filter tabs (new / recent / needs-review) appear when there are ≥2 lessons; renders up to 6 LessonPreviewCards in a 1-col (mobile) / 2-col (desktop) grid with EmptyState fallbacks.'
        }
        props={[
          "newLessons, recentLessons, needsReviewLessons",
          "hasDueTests, courseId, totalLessons",
        ]}
        usedIn={["Schedule page (below the hero)"]}
        mobileNote="Already stacks to a single column on mobile; filter tabs may collapse to a select."
        preview={
          <div className="space-y-6">
            <PreviewVariant label="desktop · filter tabs + 2-col grid">
              <LessonGridSection
                newLessons={MOCK_LESSONS}
                recentLessons={MOCK_LESSONS.slice(0, 2)}
                needsReviewLessons={MOCK_LESSONS.slice(2)}
                hasDueTests={false}
                courseId="demo-course"
                totalLessons={12}
              />
            </PreviewVariant>
            <PreviewVariant label="mobile · single column">
              <MobileFrame>
                <LessonGridSection
                  newLessons={MOCK_LESSONS}
                  recentLessons={MOCK_LESSONS.slice(0, 2)}
                  needsReviewLessons={MOCK_LESSONS.slice(2)}
                  hasDueTests={false}
                  courseId="demo-course"
                  totalLessons={12}
                />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <PageGroupHeading>All Lessons page</PageGroupHeading>

      <DescEntry
        name="CourseStatsBar"
        source="src/components/CourseStatsBar.tsx"
        description="The four course-level progress stats (words/lessons learned & mastered) shown beside the All Lessons page title. Desktop lays them out as a four-stat row, each with a hover Popover breakdown."
        props={[
          "wordsLearned, wordsMastered, totalWords",
          "lessonsLearned, lessonsMastered, totalLessons",
          "mobileTrailing? (controls pinned to the mobile stats row)",
        ]}
        usedIn={["All Lessons page header"]}
        mobileNote="The four-stat row wraps raggedly on a phone, so mobile shows only the first stat inline with a down-caret; tapping opens a dropdown listing the other three vertically. The optional mobileTrailing slot pins the LessonsList search to the right edge of that same row (its desktop home is the toolbar). Desktop keeps the full row + per-stat popovers."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · four-stat row">
              <CourseStatsBar
                wordsLearned={128}
                wordsMastered={64}
                totalWords={200}
                lessonsLearned={7}
                lessonsMastered={3}
                totalLessons={12}
              />
            </PreviewVariant>
            <PreviewVariant label="mobile · first stat + dropdown caret">
              <MobileFrame>
                <CourseStatsBar
                  wordsLearned={128}
                  wordsMastered={64}
                  totalWords={200}
                  lessonsLearned={7}
                  lessonsMastered={3}
                  totalLessons={12}
                />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="SpecialLessonsRow"
        source="src/components/lessons/SpecialLessonsRow.tsx"
        description="Horizontal snap-scroll row of auto-lesson tiles (Lost Mastery / Unmastered / Worst Words / My Notes / Best Words) shown above the lessons table for signed-in users. Filters auto-lessons from the full list, orders them, and hides the Lost Mastery / Unmastered tiles when their word count is 0. Returns null when there are no cards."
        props={['lessons: LessonWithProgress[]', 'mode?: "lesson" | "test"']}
        usedIn={["All Lessons page (above the table)"]}
        mobileNote="Already a horizontal snap-scroll row with edge fades and scroll buttons — works as-is on a phone."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop">
              <SpecialLessonsRow lessons={MOCK_AUTO_LESSONS} />
            </PreviewVariant>
            <PreviewVariant label="mobile">
              <MobileFrame>
                <SpecialLessonsRow lessons={MOCK_AUTO_LESSONS} />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="LessonsList + LessonRow"
        source="src/components/LessonsList.tsx"
        description="The full course catalogue: filter tabs, an inline search, an optional (desktop-only) stats toggle, and a lessons table. Each LessonRow shows number, emoji + title, status, and — on desktop — XP / #Words / #Learned / #Mastered plus study/test shortcut buttons."
        props={[
          "lessons: LessonWithProgress[]",
          "languageFlag?, languageName?, languageId?",
          "milestoneScores?, plans?, qaFlagCounts?, courseId?",
        ]}
        usedIn={["All Lessons page"]}
        mobileNote="Below md the row collapses to a single visible cell — every other td, the action cell included, is display:none, so no column reserves width. The chevron (or lock) rides inside the lesson cell's flex line, and that cell also takes the table's corner rounding (the number and action cells reclaim it at md). The emoji tile drops to 32px. The four numeric columns, the status column and the study/test shortcuts are dropped (status moves into a meta sub-row with XP and the word count), the table's min-width becomes md-only so it fits the viewport. Both the inline search and the (desktop-only) stats toggle are hidden below md — the search relocates to the All Lessons header row via CourseStatsBar's mobileTrailing, staying wired to the list filter through ListSearchContext. Row tap opens the lesson."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · full table">
              <LessonsList lessons={MOCK_LESSONS_WITH_PROGRESS} />
            </PreviewVariant>
            <PreviewVariant label="mobile · slimmed table (# / lesson / status / chevron)">
              <MobileFrame>
                <LessonsList lessons={MOCK_LESSONS_WITH_PROGRESS} />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <PageGroupHeading>Lesson page</PageGroupHeading>

      <DescEntry
        name="WordsList + WordRow / WordCard"
        source="src/components/WordsList.tsx"
        description="The lesson's vocabulary surface: filter tabs (All / Not started / Learning / Learned / Mastered), an inline search, a flashcard-mode button, and a list/grid view toggle. List view is a table of WordRows (number, thumbnail, English, headword, StatusPill, Avg. score, chevron); grid view swaps to WordCards. Rows/cards open the shared WordDetailSidebar in place."
        props={[
          "words: WordWithDetails[]",
          "languageName?, lessonTitle, lessonNumber",
          "wordsNotStarted / wordsLearning / wordsLearned / wordsMastered",
          "onWordSelected?, rightContent? (e.g. the desktop history toggle)",
        ]}
        usedIn={["Lesson page (/lesson/[lessonId])"]}
        mobileNote="Below md the table restacks like the dictionary: the header row is hidden and each WordRow keeps its number and thumbnail (dropped to 40px) but stacks the foreign headword beneath the English. The dedicated headword column, the Avg. score column and the chevron are all hidden md:table-cell, so the StatusPill (its size='sm' variant below md so the longest label can't bleed off the row) becomes the trailing cell and reclaims the row's right-hand corner rounding (handed back to the chevron at md). The number cell drops to text-xs-medium with tighter padding. The <colgroup> widths moved onto the hidden thead's th cells so desktop's fixed layout is byte-identical. Grid view stays 2-up on mobile (3 from sm) and each WordCard tightens its padding to p-3 (p-4 at sm). The whole toolbar control cluster — inline search, flashcard button, list/grid toggle, and the Activity-History rightContent — is hidden below md and relocated to the Lesson page header row via the shared MobileStatsDropdown trailing slot; search stays wired through ListSearchContext, and the desktop-only grid toggle is simply dropped on a phone."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · list view (full table)">
              <WordsListLive />
            </PreviewVariant>
            <PreviewVariant label="mobile · restacked list (# / word stack / status)">
              <MobileFrame>
                <WordsListLive />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="grid tiles · WordCard (toggle to grid view above)">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {MOCK_LESSON_WORDS.slice(0, 3).map((w) => (
                  <WordCard key={w.id} word={w} />
                ))}
              </div>
            </PreviewVariant>
            <PreviewVariant label="mobile · grid tiles (2-up)">
              <MobileFrame>
                <div className="grid grid-cols-2 gap-3">
                  {MOCK_LESSON_WORDS.slice(0, 4).map((w) => (
                    <WordCard key={w.id} word={w} />
                  ))}
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="Lesson page action bar"
        source="src/components/LessonPageContent.tsx"
        description="The fixed bottom bar on a lesson page. Left/right on desktop: 'previous lesson' and 'next lesson' text links flanking two centred primary buttons — 'Study lesson' and 'Take test' (the latter carries an XP badge). Inline markup owned by LessonPageContent rather than an extracted component."
        props={[
          "previousLesson / nextLesson (links)",
          "Study lesson + Take test buttons (max-w-[240px] on desktop)",
          "sidebarCollapsed (drives the left inset)",
        ]}
        usedIn={["Lesson page (/lesson/[lessonId])"]}
        mobileNote="The bar spans full width on a phone — the sidebar is off-canvas, so its desktop left-[72px]/left-[240px] inset resets to left-0 below md. The previous/next lesson links collapse to arrow-only below md (their Previous/Next label + title stack is hidden md:flex, the chevron stays), so the two primary buttons drop their max-w-[240px] cap and fill the middle. Inner padding tightens to px-4 py-3 (vs px-6 py-4). The page title downscales to text-xxl-semibold and the header stats row narrows its gap. (Description-only — the bar is inline in the page, not a standalone component to render here.)"
      />

      <PageGroupHeading>Tests hub</PageGroupHeading>

      <DescEntry
        name="MobileStatsDropdown"
        source="src/components/ui/mobile-stats-dropdown.tsx"
        description="Phone treatment for a multi-stat page header: the first stat renders inline with a caret and the rest open in a dropdown on tap. Mobile-only (md:hidden) — callers keep their own desktop row behind `hidden md:flex`, since desktop stats carry per-stat popovers that don't translate to touch."
        props={["stats: { label: string; value: ReactNode }[]", "className?"]}
        usedIn={["CourseStatsBar (All Lessons header)", "Tests hub header"]}
        mobileNote="Shown here at desktop width for inspection; in the app it only renders below md. Closes on outside click or Esc."
        preview={
          <PreviewVariant label="first stat inline + caret">
            <div className="[&>div]:!block">
              <MobileStatsDropdown
                stats={[
                  { label: "Total XP (This course)", value: <XpBadge value={1240} variant="default" size="md" /> },
                  { label: "Total Test Time", value: <span className="text-regular-semibold">2h 14m</span> },
                  { label: "Avg. score/word", value: <span className="text-regular-semibold">86%</span> },
                ]}
              />
            </div>
          </PreviewVariant>
        }
      />

      <DescEntry
        name="TestsList + TestRow"
        source="src/components/TestsList.tsx"
        description="The Tests hub table: two tabs (Tests Due / Previous Tests) over a shared table whose columns reshape per tab — Status vs Score, # Learned vs New Learned, plus an XP earned column on Previous Tests only. XP available is never a column; it sits inside the Start test button, which is identical on both tabs. Each row links its title to the lesson and opens the start-test modal."
        props={[
          "dueTests: TestForList[]",
          "previousTests: TestForList[]",
          "averageScore?: number",
        ]}
        usedIn={["Tests hub page (/course/[courseId]/tests)"]}
        mobileNote="Below md the row collapses to a single visible cell — every other td, the action cell included, is display:none, so no column reserves width. The CTA button rides inside the lesson cell's flex line, and that cell also takes the table's corner rounding (the number and action cells reclaim it at md). The emoji tile drops to 32px. The header row is hidden, the number is prepended to the title, and the rest becomes a meta sub-row led by the milestone on both tabs, each with a trailing XP chip: Tests Due follows the milestone with a dot-separated word count and trails the XP available, Previous Tests follows it with the score ring and trails the XP earned. The button's XP badge is desktop-only (hidden md:inline-flex) so the button stays narrow enough to share the row with the title. From md the button is flex-1 so all rows' buttons match width, with its contents centered. Test #, # Learned / # Mastered, the status pill and the Eye preview are dropped; the table's min-width becomes md-only so there's no sideways scroll."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · full table (both tabs)">
              <TestsList
                dueTests={MOCK_DUE_TEST_ROWS}
                previousTests={MOCK_PREVIOUS_TEST_ROWS}
                averageScore={78}
              />
            </PreviewVariant>
            <PreviewVariant label="mobile · slimmed table (lesson + meta sub-row + Test)">
              <MobileFrame>
                <TestsList
                  dueTests={MOCK_DUE_TEST_ROWS}
                  previousTests={MOCK_PREVIOUS_TEST_ROWS}
                  averageScore={78}
                />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="mobile · empty state">
              <MobileFrame>
                <TestsList dueTests={[]} previousTests={[]} />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <PageGroupHeading>Dictionary page</PageGroupHeading>

      <DescEntry
        name="DictionaryList + DictionaryRow"
        source="src/components/DictionaryList.tsx"
        description="The dictionary's whole client surface: filter tabs (Learning / Learned / Mastered / This Course / All {Language}), an inline search + CategoryFilter, an A–Z letter filter, a sortable table of DictionaryRows, and a fixed word-count footer. Each DictionaryRow shows a thumbnail (🗣️ fallback), English, the headword, word type, a StatusPill, and its lesson, with a chevron that stays stuck to the right edge behind a gradient fade on horizontal scroll. Rows open the shared word-preview panel; the table paginates 50 at a time via an IntersectionObserver sentinel."
        props={[
          "myWords / courseWords / allWords: DictionaryWord[]",
          "languageName?: string",
          "— sort/letter/category/search state is internal",
          "SortableHeader is a private sub-component",
        ]}
        usedIn={["Dictionary page (/course/[courseId]/dictionary)"]}
        mobileNote="Current (pre-refactor) state — rendered so we can rework it here. Two things break below md: (1) the table sets a fixed <colgroup> plus min-w-[800px], so the seven columns keep their desktop widths and the whole table scrolls sideways instead of collapsing like LessonsList / TestsList; (2) the word-count footer is position:fixed with a hardcoded left-[240px] desktop-sidebar offset (useSidebarCollapsed defaults false), so on a 390px phone it's shoved into a ~150px sliver bottom-right. The A–Z letter filter already wraps. Target pattern: mirror LessonRow — hide the header, drop numeric/status columns into a meta sub-row, move column widths to per-th hidden md:table-cell, gate min-width to md, and make the footer flow-relative (or offset only at md)."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · full sortable table (footer contained to the frame)">
              <div
                className="relative overflow-hidden rounded-lg"
                style={{ transform: "translateZ(0)", minHeight: 520 }}
              >
                <DictionaryListLive />
              </div>
            </PreviewVariant>
            <PreviewVariant label="mobile · current state — sideways scroll + offset footer">
              <MobileFrame>
                <DictionaryListLive />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <PageGroupHeading>Word preview panel</PageGroupHeading>

      <DescEntry
        name="WordDetailSidebar → WordDetailView + WordDetailActionBar"
        source="src/components/WordDetailSidebar.tsx"
        description="The global word-preview panel, owned by WordPreviewProvider and opened app-wide via openWord(). WordDetailSidebar is a fixed right-hand drawer (480 / 600 / 800px, cycled by the size button) that hosts WordDetailView (the scrollable English/headword/memory-trigger/related content, with inline admin editing) and pins WordDetailActionBar to its bottom (audio replay, prev/next, jump-to-word, status). Reached from DictionaryRow, lesson word lists, and header search."
        props={[
          "word: WordWithDetails",
          "lessonTitle / lessonNumber / lessonId?, lessons?",
          "wordList, currentIndex, totalWords",
          "onClose / onPrevious / onNext / onJumpToWord",
          "isAdmin?, showProgress?, isLocked?",
        ]}
        usedIn={[
          "WordPreviewProvider (rendered globally)",
          "Opened from DictionaryRow, lesson pages, header search",
        ]}
        mobileNote="Below md the drawer goes full width (max-md:!w-full overrides the inline pixel width), the size-cycle button is hidden, and the action bar switches to its compact layout — with prev/next surfaced inline and first/last + image toggle tucked into the ellipsis menu. (Preview note: the drawer is position:fixed, so the desktop box uses a transform to become its containing block and shows the true 600px drawer; the phone box renders it inside a real 390px iframe so the max-md width rule resolves — the compact action bar is JS-driven off window.matchMedia, which still sees the desktop parent, so verify that toggle in device devtools.)"
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · 600px drawer (md size), trapped in the frame">
              <div
                className="relative overflow-hidden rounded-xl bg-black/5"
                style={{ height: 660, transform: "translateZ(0)" }}
              >
                <WordDetailSidebarLive />
              </div>
            </PreviewVariant>
            <PreviewVariant label="mobile · 100% width (max-md:!w-full), flush to edges">
              <MobileFrame flush height={620}>
                {/* Transformed box at the frame's exact height: it becomes the
                    fixed drawer's containing block, so the drawer's inset-0
                    fills top-to-bottom with no gap. Inside the iframe the
                    drawer's max-md rule resolves at 390px, so it renders full
                    width; `flush` drops the frame padding so it's edge-to-edge. */}
                <div className="relative" style={{ height: 620, transform: "translateZ(0)" }}>
                  <WordDetailSidebarLive />
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <PageGroupHeading>Study &amp; Test mode</PageGroupHeading>

      <DescEntry
        name="StudyNavbar + StudyProgressBar"
        source="src/components/study/StudyNavbar.tsx · StudyProgressBar.tsx"
        description="The fixed 72px top chrome shared by the study and test flows. On desktop it's a single row: mode badge, lesson title, a 'Word X of Y' counter with inline WordTrackerDots, the timer, Exit, and (test mode) a running score. StudyProgressBar is a mobile-only 1px strip pinned directly under the navbar."
        props={[
          "StudyNavbar: mode?, lessonNumber/Title, currentWordIndex, totalWords, completedWordIndices, onJumpToWord, categories, testPointsEarned/MaxPoints, incorrectWords?",
          "StudyProgressBar: currentWordIndex, totalWords, categories?",
        ]}
        usedIn={["StudyModeClient", "TestModeClient"]}
        mobileNote="Below md the navbar keeps its 72px height but reflows into two rows. Row 1: a compact badge (drops the word 'mode' → just 'Study' / 'Test') + the lesson name (truncates) + an icon-only X exit. Row 2: the word count, running score (compact ⚡ n/n (%)) and timer in smaller, recessed text. The inline WordTrackerDots are dropped — StudyProgressBar takes over directly beneath the navbar as a thin full-width fill tracking the same 'Word X of Y' position. (Preview note: both are position:fixed, so the desktop box uses a transform to become their containing block; the phone box renders them in a real 390px iframe so the md: rules resolve — two rows + strip.)"
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · study · inline dots, no strip">
              <div
                className="relative overflow-hidden rounded-lg bg-black/5"
                style={{ height: 96, transform: "translateZ(0)" }}
              >
                <StudyChromeLive mode="study" />
              </div>
            </PreviewVariant>
            <PreviewVariant label="desktop · test · running score">
              <div
                className="relative overflow-hidden rounded-lg bg-black/5"
                style={{ height: 96, transform: "translateZ(0)" }}
              >
                <StudyChromeLive mode="test" />
              </div>
            </PreviewVariant>
            <PreviewVariant label="mobile · two rows (badge + lesson + X / stats), dots → strip">
              <MobileFrame flush height={130}>
                <div className="relative" style={{ height: 130, transform: "translateZ(0)" }}>
                  <StudyChromeLive mode="test" />
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="StudyActionBar"
        source="src/components/study/StudyActionBar.tsx"
        description="The fixed bottom bar for study and test. Left: current word · part of speech + the traffic-light ScoreIndicator. Right (desktop): clue (test), replay, first/prev/next/last, then a toggle cluster — edit (admin), accents, image mode, music, settings — each opening an upward dropdown."
        props={[
          "mode?, currentWordIndex, totalWords, englishWord, foreignWord, category, scoreStats, testHistory, wordStatus, correctStreak",
          "onJumpToWord, onPreviousWord, onNextWord, onRestart, onRevealClue (test)",
          "imageMode/onImageModeChange, music props, settings toggles, languageCode/onInsertCharacter (accents)",
          "onOpenWordList? (mobile hamburger), isAdmin/onEditModeToggle",
        ]}
        usedIn={["StudyModeClient", "TestModeClient"]}
        mobileNote="Below md the bar keeps the essentials inline — a word-list hamburger at the start, word info + score, then replay · prev/next (· clue in test) — and moves the rest into a `⋯` overflow bottom-sheet. The sheet holds image-mode plus accents / music / settings (each an accordion reusing the exact desktop dropdown body) and the admin edit toggle; first/last skip and accents leave the row (the phone keyboard handles accents natively). Tap `⋯` inside the phone frame to open the sheet (fixed inset-0, scrim + rounded-top panel)."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · study · full inline controls">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <StudyActionBarLive mode="study" />
              </div>
            </PreviewVariant>
            <PreviewVariant label="desktop · test · clue + score">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <StudyActionBarLive mode="test" />
              </div>
            </PreviewVariant>
            <PreviewVariant label="mobile · essentials inline + ⋯ overflow sheet (tap ⋯)">
              <MobileFrame flush height={340}>
                <div className="relative h-full" style={{ transform: "translateZ(0)" }}>
                  <div className="absolute inset-x-0 bottom-0 bg-white shadow-bar">
                    <StudyActionBarLive mode="study" />
                  </div>
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="StudyWordListSidebar"
        source="src/components/study/StudyWordListSidebar.tsx"
        description="The lesson's word list — a number, thumbnail, and word/translation per row, with the current word highlighted, auto-scroll-into-view, and top/bottom scroll fades. In test mode not-yet-reached rows show as disabled skeletons and answers stay hidden until answered."
        props={[
          "wordList, currentWordIndex, completedWordIndices, onJumpToWord, mode?",
          "test-mode: testResults, hideSecondaryIndices, revealThumbnailIndices, primaryField, roundLabels",
          "categories?, isOpen? / onClose? (mobile drawer)",
        ]}
        usedIn={["StudyModeClient", "TestModeClient"]}
        mobileNote="Below md the fixed 240px rail is hidden and the list instead lives in a left slide-over drawer, opened by the StudyActionBar hamburger. Scrim + 85%-width (max 320px) panel that slides in from the left; a header with a close X sits above the same list. Tapping a word jumps and closes; the scrim, the X, or Esc also close it. The list renders as its own instance here (separate scroll refs from the desktop rail, since both stay mounted)."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="mobile · slide-over drawer (tap to open)">
              <MobileFrame flush height={460}>
                <div className="relative bg-[#faf8f3]" style={{ height: 460, transform: "translateZ(0)" }}>
                  <StudyWordListDrawerLive />
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="StudySidebar"
        source="src/components/study/StudySidebar.tsx"
        description="The right-column content stack for study/test: dismissible tip cards, a Notes card (system + editable user notes), an Example Sentences card, a Related Words card, and (admin) the DeveloperSection. Each content card is a white rounded-2xl shadow-card with an uppercase section label."
        props={[
          "wordId, systemNotes, userNotes, exampleSentences, relatedWords, isEnabled",
          "onUserNotesChange, onRelatedClick?, isAdmin? / onSystemNotesChange?",
          "tips / dismissedTipIds / onDismissTip, developer* fields (admin)",
        ]}
        usedIn={["StudyModeClient", "TestModeClient"]}
        mobileNote="Below md the sidebar drops beneath the word card and its cards stack full-width. Cards stay fully expanded (no collapsing) — the same content as desktop, just single-column."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · cards in the right column">
              <div className="max-w-[360px] rounded-lg bg-[#faf8f3] p-4">
                <StudySidebarLive />
              </div>
            </PreviewVariant>
            <PreviewVariant label="mobile · cards stack full-width">
              <MobileFrame flush height={520}>
                <div className="min-h-full bg-[#faf8f3] p-4" style={{ transform: "translateZ(0)" }}>
                  <StudySidebarLive />
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="AnswerInput / TestAnswerInput"
        source="src/components/study/AnswerInput.tsx"
        description="The typed-answer field that sits in the fixed bottom bar (above StudyActionBar). A rounded bordered row: text input on the left, feedback word + Submit/Next button on the right. After submitting it locks to a character-level diff (green/red) and swaps Submit for Next. TestAnswerInput is the test-mode sibling with the same layout (no retry, adds clue handling). InformationNextButton reuses the row for read-only pages."
        props={[
          "wordId, languageName, languageCode?, validAnswers, isVisible, isLastWord",
          "onSubmit, onNextWord, strictMode? (study) / clueLevel?, existingResult? (test)",
        ]}
        usedIn={["StudyModeClient", "TestModeClient"]}
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · study answer field">
              <MobileFrame width={820}>
                <AnswerInputDemo />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="mobile · study answer field">
              <MobileFrame>
                <AnswerInputDemo />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="feedback · correct (full marks, green)">
              <MobileFrame width={820}>
                <AnswerFeedbackDemo grade="correct" />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="mobile · feedback correct (full marks, green)">
              <MobileFrame>
                <AnswerFeedbackDemo grade="correct" />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="feedback · half correct (partial, amber diff)">
              <MobileFrame width={820}>
                <AnswerFeedbackDemo grade="half-correct" />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="feedback · incorrect (zero, red)">
              <MobileFrame width={820}>
                <AnswerFeedbackDemo grade="incorrect" />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="InformationNextButton"
        source="src/components/study/InformationNextButton.tsx"
        description="Read-only variant of the answer row used on information/fact pages that have no question to answer. Shows a muted 'Read and continue' label on the left and a Next / Finish lesson button on the right. The button auto-focuses on mount and a window Enter listener advances the page, so a learner can page through with the keyboard alone."
        props={["isLastWord", "onNext"]}
        usedIn={["StudyModeClient"]}
        mobileNote="Shares the answer-row tightening below md: inner padding drops to pr-1.5 py-1.5 (vs pr-2 py-2) and the label shrinks to text-base (16px) before returning to text-xl at md."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · information page footer">
              <MobileFrame width={820}>
                <div inert>
                  <InformationNextButton isLastWord={false} onNext={() => {}} />
                </div>
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="mobile · information page footer">
              <MobileFrame>
                <div inert>
                  <InformationNextButton isLastWord={false} onNext={() => {}} />
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="StartTestModal"
        source="src/components/study/StartTestModal.tsx"
        description="The pre-test setup dialog: pick a test direction (English→language, language→English, picture-only) and toggle Test twice / random order, then Start. Persists the last-used settings to localStorage. Wrapped by LessonStartTestModal in the app, which builds the test URL."
        props={[
          "languageName, lessonTitle, wordCount, wordsWithImages, defaultTestType?",
          "onStart(testType, testTwice, randomOrder), onCancel",
        ]}
        usedIn={["StudyModeClient", "LessonStartTestModal"]}
        mobileNote="Card is mx-4 w-full max-w-2xl and scrolls (max-h-[90vh]); the type options and settings are full-width stacked rows already. Padding tightens to p-5 below sm."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · start test setup">
              <MobileFrame width={820} height={620} flush>
                <StartTestModalDemo />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="mobile · start test setup">
              <MobileFrame height={640} flush>
                <StartTestModalDemo />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="LessonCompletedModal"
        source="src/components/study/LessonCompletedModal.tsx"
        description="Shown when a study lesson finishes. Built on CompletedModalShell: header with lesson title + elapsed time + view toggles, a tabbed WordGrid (All / Learning / Learned / Mastered), and a footer of tile actions (Start test / Study again / Not now). Clicking a word opens its detail view in place."
        props={[
          "lesson, words, wordProgressMap, elapsedSeconds, hideStartTest?",
          "onStartTest, onStudyAgain, onDismiss",
        ]}
        usedIn={["StudyModeClient"]}
        mobileNote="Shell padding tightens below sm (px-5/p-4 vs px-8/p-8), the title drops to text-2xl, the WordGrid defaults to 3 columns (a phone-only toggle switches it to 2), and the footer tiles wrap into a 2-col grid. Previews use synthetic words."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · lesson completed">
              <MobileFrame width={820} height={620} flush>
                <LessonCompletedModalDemo />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="mobile · lesson completed">
              <MobileFrame height={680} flush>
                <LessonCompletedModalDemo />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="TestCompletedModal"
        source="src/components/study/TestCompletedModal.tsx"
        description="Shown when a test finishes. Same CompletedModalShell frame as the lesson modal, but the header carries the score summary (XP, %, learned/mastered/vocab) and the footer adapts to the score: a perfect run offers Retest all / Done, an imperfect run offers Retest incorrect / Study incorrect / Retest all / Not now. WordGrid tiles show per-word XP."
        props={[
          "lesson, words, wordResultsMap, elapsedSeconds, totalPoints, maxPoints, scorePercent",
          "newlyLearnedCount, masteredWordsCount, courseWordsMastered, newlyLearnedWordIds, masteredWordIds",
          "onDone, onTestAgain, onRetestIncorrect, onStudyIncorrect",
        ]}
        usedIn={["TestModeClient"]}
        mobileNote="Below sm the header stats condense to a headline line (time + score) plus a smaller learned/mastered/vocab line without dot separators; the desktop 4/5 column toggle is swapped for a phone-only 2/3 toggle. The up-to-4 footer actions become a 2x2 grid, and the WordGrid defaults to 3 columns (toggle to 2). Previews show an imperfect run with synthetic scores."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · test completed (imperfect)">
              <MobileFrame width={820} height={620} flush>
                <TestCompletedModalDemo />
              </MobileFrame>
            </PreviewVariant>
            <PreviewVariant label="mobile · test completed (imperfect)">
              <MobileFrame height={720} flush>
                <TestCompletedModalDemo />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="WordGrid"
        source="src/components/study/WordGrid.tsx"
        description="Grid of word tiles (image, headword, English, optional per-word XP score badge and StatusPill) shared by the lesson and test 'completed' modals. Image mode switches between the memory-trigger and flashcard surfaces; showForeign can hide the headword for self-testing, and columns toggles the desktop density between 4 and 5."
        props={[
          'words: WordWithDetails[]',
          'imageMode: "memory-trigger" | "flashcard"',
          "showForeign?, columns? (4 | 5), showStatus?",
          "wordResults?: Map<id, { grade, pointsEarned, maxPoints }>",
          "onWordClick?",
        ]}
        usedIn={["LessonCompletedModal", "TestCompletedModal"]}
        mobileNote="The phone column count is independent of the desktop 4/5 toggle: mobileColumns (2 | 3, default 3) drives grid-cols-2|3 while columns drives sm:grid-cols-4|5. The completed modals expose a phone-only toggle for it. Tile gap tightens to gap-3 (gap-4 at sm)."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · 5-col grid with status pills">
              <WordGrid words={MOCK_LESSON_WORDS} imageMode="memory-trigger" showStatus />
            </PreviewVariant>
            <PreviewVariant label="mobile · 3-col grid">
              <MobileFrame>
                <WordGrid words={MOCK_LESSON_WORDS} imageMode="memory-trigger" showStatus />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <PageGroupHeading>Settings &amp; Profile page</PageGroupHeading>

      <DescEntry
        name="Settings card wrapper"
        source="src/components/settings/*Section.tsx"
        description="Shared white rounded-2xl card that wraps every Settings section (Profile, Preferences, Billing, Security, Marketing email, Data export, Danger zone). Not a component — a repeated wrapper (rounded-2xl bg-white … shadow-card / red-bordered for Danger zone)."
        props={["padding p-4 sm:p-6", "mb-6 rounded-2xl", "shadow-card"]}
        usedIn={["Settings page (all sections)"]}
        mobileNote="Card padding tightens to p-4 below sm (was a hardcoded p-6), restoring p-6 at sm+ so desktop is unchanged. Applied uniformly across all settings cards for consistent gutters on a phone."
      />

      <DescEntry
        name="ProfileSection"
        source="src/components/settings/ProfileSection.tsx"
        description="Profile Information card with view/edit modes: avatar upload, name/username, hometown/current-location, nationalities, bio, website. Reads useUser() for avatar refresh and takes the persisted settings as a prop."
        props={["settings: UserSettings", "useUser() (avatar refresh)"]}
        usedIn={["Settings page"]}
        mobileNote="Header row wraps below sm (flex-wrap gap-3) so the Edit / Cancel+Save actions drop under the title instead of overflowing. The edit-mode location fields go single-column (grid-cols-1 sm:grid-cols-2) and the view-mode Hometown/Location/Nationalities row stacks (grid-cols-1 sm:grid-cols-3). Card padding follows the shared p-4 sm:p-6 wrapper."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · view mode (3-col info grid)">
              <ProfileSection settings={MOCK_USER_SETTINGS} />
            </PreviewVariant>
            <PreviewVariant label="mobile · stacked fields + wrapped header">
              <MobileFrame>
                <ProfileSection settings={MOCK_USER_SETTINGS} />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="PreferencesSection"
        source="src/components/settings/PreferencesSection.tsx"
        description="Preferences card with a staged Save/Cancel model: daily XP goal editor plus toggles for hover descriptions, related words, and word audio icons, and a reset-tips action. Local toggles persist to localStorage; the goal is server-backed."
        props={["dailyXpGoal: number", "DailyGoalEditor", "localStorage prefs"]}
        usedIn={["Settings page"]}
        mobileNote="The header row wraps below sm (flex-wrap) so the Save/Cancel buttons drop beneath the 'Preferences' title. The Daily-XP-goal row stacks its label above the editor (flex-col gap-4 sm:flex-row sm:justify-between). Card padding follows the shared p-4 sm:p-6 wrapper."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · goal row inline, toggles right-aligned">
              <PreferencesSection dailyXpGoal={50} />
            </PreviewVariant>
            <PreviewVariant label="mobile · goal row stacked">
              <MobileFrame>
                <PreferencesSection dailyXpGoal={50} />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <PageGroupHeading>Subscriptions page</PageGroupHeading>

      <DescEntry
        name="LanguageSubscriptionsList + LanguageSubscriptionRow"
        source="src/components/subscriptions/LanguageSubscriptionRow.tsx"
        description="The per-language subscription table: a desktop column-header row (Language / # Courses / # Lessons) over one row per language. Each row shows the flag+name, course count, access state (Unlocked or lessons + locked badge), an optional per-row unlock CTA (free plan only), and a chevron that expands the course list."
        props={[
          "languages, unlockedLanguageIds",
          "canUnlockIndividually, selectedLanguageId",
          "lang, accessUnlocked, showUnlockCta, isSelected",
          "isExpanded, onToggleExpand, onUnlock",
        ]}
        usedIn={["Subscriptions page (language list)"]}
        mobileNote="Below sm the fixed 5-col grid (240/180/1fr/220/40) becomes a stacked card and the desktop column-header row is hidden (hidden sm:grid), so each value stacks on its own line. The chevron floats to the card's top-right (absolute right-4 top-4) and returns to its grid column at sm (sm:static); the empty action cell is hidden on mobile to avoid a dead gap. Row padding tightens to px-4 py-4 (vs px-8 py-5) and the row dividers / empty state to mx-4 / px-4."
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · 5-col grid with header row (Italian unlocked)">
              <LanguageSubscriptionsListDemo />
            </PreviewVariant>
            <PreviewVariant label="mobile · stacked cards, inline labels, floated chevron">
              <MobileFrame>
                <LanguageSubscriptionsListDemo />
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />

      <DescEntry
        name="CheckoutFooterBar"
        source="src/components/subscriptions/CheckoutFooterBar.tsx"
        description="Sticky bottom checkout bar shown when a user picks an upgrade target. A header row carries the cart icon + 'Upgrade plan' label; the controls row below holds the target dropup (All languages / each language) and plan-type dropup (Monthly / Annual / Lifetime) on the left, and the computed total (with annual-savings copy) + 'Proceed to Checkout' button on the right. Offsets for the sidebar width."
        props={[
          "target, plans, languages",
          "creditBalanceCents",
          "onChangeTarget, onClose",
        ]}
        usedIn={["Subscriptions page (checkout footer)"]}
        mobileNote="A dedicated header row (cart icon + 'Upgrade plan') now sits above a controls row, which unsqueezes the desktop layout too. The controls row is flex justify-between on desktop (dropups left, total+CTA right) and stacks below sm (flex-col): the target/plan dropups sit above a total+CTA block, the dropups themselves wrap (flex-wrap), and the 'Proceed to Checkout' button goes full-width (w-full sm:w-auto). Inner padding tightens to px-4 py-3 (vs px-6 py-4). The fixed positioning and sidebar offset are unchanged. (Preview note: the bar is position:fixed, so each box uses a transform to become its containing block; on desktop it keeps its lg:left-[240px] sidebar offset, so it starts inset from the left inside the trapped box — that gap is the sidebar reservation, not a bug.)"
        preview={
          <div className="space-y-4">
            <PreviewVariant label="desktop · label row on top, dropups left + total/CTA right (offset for sidebar)">
              <div
                className="relative overflow-hidden rounded-lg bg-black/5"
                style={{ height: 168, transform: "translateZ(0)" }}
              >
                <CheckoutFooterBarDemo />
              </div>
            </PreviewVariant>
            <PreviewVariant label="mobile · label row, dropups, then full-width CTA">
              <MobileFrame flush height={280}>
                <div className="relative" style={{ height: 280, transform: "translateZ(0)" }}>
                  <CheckoutFooterBarDemo />
                </div>
              </MobileFrame>
            </PreviewVariant>
          </div>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interactive demos
// ---------------------------------------------------------------------------

function SwitchDemo() {
  const [on, setOn] = useState(true);
  return <Switch checked={on} onCheckedChange={setOn} />;
}

function InlineSearchDemo() {
  const [value, setValue] = useState("");
  return (
    <InlineSearch
      value={value}
      onChange={setValue}
      placeholder="Filter lessons..."
    />
  );
}

function TabsDemo() {
  const [tab, setTab] = useState("new");
  return (
    <Tabs
      tabs={[
        { id: "new", label: "New lessons" },
        { id: "recent", label: "Recent lessons" },
        { id: "review", label: "Needs review" },
      ]}
      activeTab={tab}
      onChange={setTab}
    />
  );
}

const CATEGORY_FILTER_OPTIONS: CategoryOption[] = [
  { value: "word", label: "Words" },
  { value: "sentence", label: "Sentences" },
  { value: "phrase", label: "Phrases" },
  { value: "fact", label: "Facts" },
  { value: "information", label: "Information" },
];

function CategoryFilterDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <CategoryFilter
      options={CATEGORY_FILTER_OPTIONS}
      selected={selected}
      onChange={setSelected}
    />
  );
}

/**
 * Live DictionaryList wired with sample data. DictionaryList calls
 * useWordPreview(), which throws without a provider, so we wrap it in the real
 * WordPreviewProvider (UserProvider is available app-wide from the root layout).
 * The provider reads useSearchParams, so it sits inside a Suspense boundary.
 * Opening a row fires fetchWordPreview() with a mock id that resolves to no
 * word, so the panel never actually renders here — the block stays focused on
 * the table itself.
 */
function DictionaryListLive() {
  return (
    <Suspense fallback={null}>
      <WordPreviewProvider>
        <DictionaryList
          myWords={MOCK_DICTIONARY_MY_WORDS}
          courseWords={MOCK_DICTIONARY_WORDS}
          allWords={MOCK_DICTIONARY_WORDS}
          languageName="Italian"
        />
      </WordPreviewProvider>
    </Suspense>
  );
}

/**
 * Live lesson word list. WordsList reads useUser() (app-wide from the root
 * layout) and useSearchParams, so it sits inside a Suspense boundary; selecting
 * a row renders WordDetailSidebar (which needs useWordPreview), so we also wrap
 * in WordPreviewProvider to match DictionaryListLive. Callbacks are inert — the
 * block stays focused on the list/grid itself.
 */
function WordsListLive() {
  return (
    <Suspense fallback={null}>
      <WordPreviewProvider>
        <WordsList
          words={MOCK_LESSON_WORDS}
          languageName="Italian"
          wordsNotStarted={1}
          wordsLearning={2}
          wordsLearned={1}
          wordsMastered={1}
          lessonTitle="Greetings & Introductions"
          lessonNumber={1}
        />
      </WordPreviewProvider>
    </Suspense>
  );
}

/**
 * Live word-preview drawer. WordDetailSidebar/View lean only on safe contexts:
 * useAudio (self-contained), useUpgradeModal / useStudyExitGuard (return null
 * without a provider), useText (built-in fallback). The one hard requirement is
 * useWordPreview, so it's wrapped in WordPreviewProvider (inside Suspense for
 * the provider's useSearchParams). Callbacks are inert no-ops — this is a static
 * showcase, not a working navigator. The drawer is position:fixed, so callers
 * must give it a transformed containing block (see the preview boxes below) to
 * trap it instead of letting it overlay the whole catalog page.
 */
function WordDetailSidebarLive() {
  return (
    <Suspense fallback={null}>
      <WordPreviewProvider>
        <WordDetailSidebar
          word={MOCK_WORD_DETAIL}
          lessonTitle="Greetings & Introductions"
          lessonNumber={1}
          lessonId="app-ui-demo-lesson"
          lessons={[{ id: "app-ui-demo-lesson", number: 1, title: "Greetings & Introductions" }]}
          onClose={() => {}}
          onPrevious={() => {}}
          onNext={() => {}}
          onJumpToWord={() => {}}
          hasPrevious={false}
          hasNext
          currentIndex={0}
          totalWords={MOCK_WORD_DETAIL_LIST.length}
          wordList={MOCK_WORD_DETAIL_LIST}
          showProgress
        />
      </WordPreviewProvider>
    </Suspense>
  );
}

/**
 * Live study/test chrome: the fixed StudyNavbar plus the mobile-only
 * StudyProgressBar that sits directly under it. Both are position:fixed, so
 * callers must give them a transformed containing block (see the preview boxes)
 * to trap them inside the frame instead of pinning to the catalog viewport.
 * Callbacks are inert — this is a static showcase. On desktop the navbar shows
 * its inline WordTrackerDots and the progress strip is hidden; inside the phone
 * frame the dots hide and the thin strip appears.
 */
function StudyChromeLive({ mode = "study" }: { mode?: "study" | "test" }) {
  const categories = ["greeting", "greeting", "greeting", "greeting", "greeting"];
  return (
    <>
      <StudyNavbar
        mode={mode}
        courseName="Italian"
        elapsedSeconds={128}
        onExitLesson={() => {}}
        lessonNumber={1}
        lessonTitle="Greetings & Introductions"
        currentWordIndex={2}
        totalWords={categories.length}
        completedWordIndices={[0, 1]}
        onJumpToWord={() => {}}
        categories={categories}
        testPointsEarned={mode === "test" ? 12 : 0}
        testMaxPoints={mode === "test" ? 18 : 0}
      />
      <StudyProgressBar
        currentWordIndex={2}
        totalWords={categories.length}
        categories={categories}
      />
    </>
  );
}

/**
 * StudyActionBar rendered with mock data. It's an in-flow bar (not fixed), so it
 * sits in a bordered box on desktop. On mobile the toggle cluster collapses into
 * a `⋯` overflow bottom-sheet and a word-list hamburger appears at the start —
 * tap them inside the phone frame to see the sheet (fixed inset-0 within the iframe).
 */
function StudyActionBarLive({ mode = "study" }: { mode?: "study" | "test" }) {
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");
  return (
    <StudyActionBar
      mode={mode}
      currentWordIndex={2}
      totalWords={5}
      englishWord="hello"
      foreignWord="ciao"
      partOfSpeech="interjection"
      category="word"
      wordList={[]}
      completedWordIndices={[0, 1, 2]}
      testHistory={[{ pointsEarned: 3, maxPoints: 3 }]}
      scoreStats={{ totalPointsEarned: 9, totalMaxPoints: 12, scorePercent: 75, timesTested: 4 }}
      wordStatus="learning"
      correctStreak={1}
      onJumpToWord={() => {}}
      onPreviousWord={() => {}}
      onNextWord={() => {}}
      onRestart={() => {}}
      hasSubmittedAnswer
      languageCode="it"
      onInsertCharacter={() => {}}
      imageMode={imageMode}
      onImageModeChange={setImageMode}
      musicTracks={[]}
      onOpenWordList={() => {}}
      isAdmin
      onEditModeToggle={() => {}}
    />
  );
}

/**
 * StudyWordListSidebar's mobile drawer. The desktop 240px rail is `hidden md:flex`,
 * so inside the 390px phone frame only the slide-over renders. The trigger mimics
 * the real UX — a hamburger pinned bottom-left (where the StudyActionBar's word-list
 * button sits). Tap it to slide the drawer in; tapping a word or the scrim closes it.
 */
function StudyWordListDrawerLive() {
  const [open, setOpen] = useState(false);
  const english = ["hello", "goodbye", "please", "thank you", "yes", "no", "water", "food"];
  const foreign = ["ciao", "arrivederci", "per favore", "grazie", "sì", "no", "acqua", "cibo"];
  const words = english.map((en, i) => ({
    id: `w${i}`,
    english: en,
    foreign: foreign[i],
    imageUrl: null,
  }));
  return (
    <div className="relative h-full">
      {/* Mimics the StudyActionBar hamburger: pinned to the bottom-left corner. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show words"
        className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-foreground shadow-bar hover:bg-bone-hover"
      >
        <Menu className="h-5 w-5" />
      </button>
      <StudyWordListSidebar
        wordList={words}
        currentWordIndex={2}
        completedWordIndices={[0, 1, 2]}
        onJumpToWord={() => {}}
        mode="study"
        categories={words.map(() => "word")}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

/**
 * Live StudySidebar wired with mock notes, example sentences, and related words.
 * Demonstrates the mobile accordion: inside the phone frame each content card is
 * collapsed behind a chevron header; the desktop preview shows them expanded.
 */
function StudySidebarLive() {
  const [userNotes, setUserNotes] = useState<string | null>(
    "Remember: 'ciao' works for both hello and goodbye."
  );
  const exampleSentences = [
    {
      id: "s1",
      foreign_sentence: "Ciao, come stai?",
      english_sentence: "Hi, how are you?",
      thumbnail_image_url: null,
    },
    {
      id: "s2",
      foreign_sentence: "Ciao a tutti!",
      english_sentence: "Hi everyone!",
      thumbnail_image_url: null,
    },
  ] as unknown as ExampleSentence[];
  const relatedWords = {
    compound: [
      {
        id: "r1",
        english: "goodbye",
        headword: "arrivederci",
        memory_trigger_image_url: null,
      },
    ],
    sentence: [],
    grammar: [],
  };
  return (
    <StudySidebar
      wordId="demo-word"
      systemNotes="An informal greeting used at any time of day."
      userNotes={userNotes}
      exampleSentences={exampleSentences}
      relatedWords={relatedWords}
      isEnabled
      onUserNotesChange={setUserNotes}
    />
  );
}

/**
 * AnswerInput preview. The real input auto-focuses on mount and re-grabs focus on
 * blur (so a learner never loses their cursor mid-answer). With two live instances
 * on one page (desktop + mobile frames) they fight over focus, so the previews are
 * wrapped in an `inert` container — display-only, which is all the catalog needs.
 */
function AnswerInputDemo() {
  return (
    <div inert>
      <AnswerInput
        wordId="demo"
        languageName="Italian"
        languageCode="it"
        validAnswers={["ciao"]}
        isVisible
        isLastWord={false}
        onSubmit={() => {}}
        onNextWord={() => {}}
      />
    </div>
  );
}

/**
 * Post-submit feedback states. TestAnswerInput renders a locked, read-only
 * result whenever `existingResult` is supplied, so we can show each grade
 * without driving the input. Tone follows points earned: full marks = green
 * (correct), partial = amber (half-correct diff), zero = red (incorrect).
 */
const FEEDBACK_RESULTS: Record<"correct" | "half-correct" | "incorrect", TestAnswerResult> = {
  correct: {
    isCorrect: true,
    userAnswer: "ciao",
    correctAnswer: "ciao",
    mistakeCount: 0,
    pointsEarned: 3,
    maxPoints: 3,
    scorePercent: 100,
    grade: "correct",
    scoreLetter: "A",
  },
  "half-correct": {
    isCorrect: false,
    userAnswer: "chao",
    correctAnswer: "ciao",
    mistakeCount: 1,
    pointsEarned: 1,
    maxPoints: 3,
    scorePercent: 33,
    grade: "half-correct",
    scoreLetter: "D",
  },
  incorrect: {
    isCorrect: false,
    userAnswer: "buongiorno",
    correctAnswer: "ciao",
    mistakeCount: 4,
    pointsEarned: 0,
    maxPoints: 3,
    scorePercent: 0,
    grade: "incorrect",
    scoreLetter: "F",
  },
};

function AnswerFeedbackDemo({ grade }: { grade: "correct" | "half-correct" | "incorrect" }) {
  return (
    <div inert>
      <TestAnswerInput
        wordId="demo"
        languageName="Italian"
        languageCode="it"
        validAnswers={["ciao"]}
        isVisible
        isLastWord={false}
        clueLevel={0}
        existingResult={FEEDBACK_RESULTS[grade]}
        onSubmit={() => {}}
        onNextWord={() => {}}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion / start-test modal previews (synthetic, self-contained data)
// ---------------------------------------------------------------------------

// A small synthetic lesson + word set so the completion modals render
// deterministically in the catalog without touching real user data, auth, or
// network queries. Images are null on purpose so WordGrid's built-in fallback
// shows rather than depending on external URLs. Cast like the other demos.
const MOCK_MODAL_LESSON = { number: 1, title: "Greetings & Introductions" } as unknown as Lesson;

const MOCK_MODAL_WORDS = [
  { id: "w1", english: "hello", headword: "ciao", status: "mastered", category: "vocabulary", memory_trigger_image_url: null, flashcard_image_url: null, memory_trigger_video_url: null },
  { id: "w2", english: "goodbye", headword: "arrivederci", status: "learned", category: "vocabulary", memory_trigger_image_url: null, flashcard_image_url: null, memory_trigger_video_url: null },
  { id: "w3", english: "please", headword: "per favore", status: "learning", category: "vocabulary", memory_trigger_image_url: null, flashcard_image_url: null, memory_trigger_video_url: null },
  { id: "w4", english: "thank you", headword: "grazie", status: "learned", category: "vocabulary", memory_trigger_image_url: null, flashcard_image_url: null, memory_trigger_video_url: null },
  { id: "w5", english: "yes", headword: "sì", status: "learning", category: "vocabulary", memory_trigger_image_url: null, flashcard_image_url: null, memory_trigger_video_url: null },
  { id: "w6", english: "good morning", headword: "buongiorno", status: "mastered", category: "vocabulary", memory_trigger_image_url: null, flashcard_image_url: null, memory_trigger_video_url: null },
] as unknown as WordWithDetails[];

function StartTestModalDemo() {
  return (
    <StartTestModal
      languageName="Italian"
      lessonTitle="Greetings & Introductions"
      wordCount={6}
      wordsWithImages={4}
      onStart={() => {}}
      onCancel={() => {}}
    />
  );
}

function LessonCompletedModalDemo() {
  return (
    <LessonCompletedModal
      lesson={MOCK_MODAL_LESSON}
      words={MOCK_MODAL_WORDS}
      wordProgressMap={new Map()}
      elapsedSeconds={143}
      onStartTest={() => {}}
      onStudyAgain={() => {}}
      onDismiss={() => {}}
    />
  );
}

function TestCompletedModalDemo() {
  // Imperfect run so the full 4-action footer and the "Incorrect words" tab show.
  const wordResultsMap = new Map<string, TestWordResult>([
    ["w1", { wordId: "w1", pointsEarned: 3, maxPoints: 3, isCorrect: true, grade: "correct" }],
    ["w2", { wordId: "w2", pointsEarned: 3, maxPoints: 3, isCorrect: true, grade: "correct" }],
    ["w3", { wordId: "w3", pointsEarned: 2, maxPoints: 3, isCorrect: false, grade: "half-correct" }],
    ["w4", { wordId: "w4", pointsEarned: 1, maxPoints: 3, isCorrect: false, grade: "half-correct" }],
    ["w5", { wordId: "w5", pointsEarned: 0, maxPoints: 3, isCorrect: false, grade: "incorrect" }],
    ["w6", { wordId: "w6", pointsEarned: 3, maxPoints: 3, isCorrect: true, grade: "correct" }],
  ]);
  return (
    <TestCompletedModal
      lesson={MOCK_MODAL_LESSON}
      words={MOCK_MODAL_WORDS}
      wordResultsMap={wordResultsMap}
      elapsedSeconds={187}
      totalPoints={12}
      maxPoints={18}
      scorePercent={67}
      newlyLearnedCount={2}
      masteredWordsCount={1}
      courseWordsMastered={42}
      newlyLearnedWordIds={["w1", "w6"]}
      masteredWordIds={["w1"]}
      onDone={() => {}}
      onTestAgain={() => {}}
      onRetestIncorrect={() => {}}
      onStudyIncorrect={() => {}}
    />
  );
}

// --- Settings & Profile demos ---------------------------------------------

// A fully-populated settings object so ProfileSection's view mode renders every
// field (avatar, name/username, hometown/location, nationalities, bio, website).
const MOCK_USER_SETTINGS = {
  id: "app-ui-demo-user",
  email: "sample@200wad.com",
  name: "Sample Learner",
  username: "sample_learner",
  avatarUrl: null,
  bio: "Learning Italian one word at a time.",
  website: "https://example.com",
  hometown: "London",
  location: "Berlin",
  nationalities: ["United Kingdom", "Germany"],
  wordsPerDay: 20,
  dailyXpGoal: 50,
  marketingEmailConsent: true,
  createdAt: new Date("2024-01-01").toISOString(),
} as UserSettings;

// --- Subscriptions demos ---------------------------------------------------

const MOCK_SUB_COURSES: LanguageCourse[] = [
  { id: "sub-c1", name: "Italian for Beginners", level: "A1", totalLessons: 20, wordCount: 240, thumbnailUrl: null, freeLessons: 3 },
  { id: "sub-c2", name: "Everyday Italian", level: "A2", totalLessons: 18, wordCount: 210, thumbnailUrl: null, freeLessons: 3 },
];

const MOCK_SUBSCRIPTION_LANGUAGES: SubscriptionLanguage[] = [
  { id: "sub-lang-it", name: "Italian", code: "it", courseCount: 2, totalWords: 450, totalLessons: 38, freeLessons: 6, courses: MOCK_SUB_COURSES },
  { id: "sub-lang-fr", name: "French", code: "fr", courseCount: 1, totalWords: 300, totalLessons: 24, freeLessons: 3, courses: [{ id: "sub-c3", name: "French Foundations", level: "A1", totalLessons: 24, wordCount: 300, thumbnailUrl: null, freeLessons: 3 }] },
  { id: "sub-lang-es", name: "Spanish", code: "es", courseCount: 3, totalWords: 600, totalLessons: 50, freeLessons: 9, courses: [{ id: "sub-c4", name: "Spanish Essentials", level: "A1", totalLessons: 26, wordCount: 320, thumbnailUrl: null, freeLessons: 3 }] },
];

// Only the fields CheckoutFooterBar reads (id/tier/billing_model/amount_cents).
const MOCK_PRICING_PLANS = [
  { id: "p-all-m", tier: "all-languages", billing_model: "monthly", amount_cents: 1499 },
  { id: "p-all-a", tier: "all-languages", billing_model: "annual", amount_cents: 11988 },
  { id: "p-all-l", tier: "all-languages", billing_model: "lifetime", amount_cents: 29900 },
  { id: "p-lang-m", tier: "language", billing_model: "monthly", amount_cents: 999 },
  { id: "p-lang-a", tier: "language", billing_model: "annual", amount_cents: 7188 },
] as unknown as PricingPlan[];

const MOCK_UPGRADE_TARGET: UpgradeTarget = {
  tier: "all-languages",
  targetId: null,
  targetName: "All Languages",
  flag: "🌍",
};

/**
 * Live subscription list wrapped in the white card it sits in on the page, with
 * one language pre-unlocked (Italian) and per-row unlock CTAs enabled so the
 * locked/CTA states render. Selecting a row toggles its "Selected" state.
 */
function LanguageSubscriptionsListDemo() {
  const [selected, setSelected] = useState<string | null>("sub-lang-fr");
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <LanguageSubscriptionsList
        languages={MOCK_SUBSCRIPTION_LANGUAGES}
        unlockedLanguageIds={["sub-lang-it"]}
        canUnlockIndividually
        selectedLanguageId={selected}
        onUnlockLanguage={(lang) => setSelected(lang.id)}
      />
    </div>
  );
}

/** Live checkout footer. It's position:fixed, so callers must trap it in a
 *  transformed containing block (see the preview boxes). */
function CheckoutFooterBarDemo() {
  const [target, setTarget] = useState<UpgradeTarget>(MOCK_UPGRADE_TARGET);
  return (
    <CheckoutFooterBar
      target={target}
      plans={MOCK_PRICING_PLANS}
      languages={MOCK_SUBSCRIPTION_LANGUAGES}
      creditBalanceCents={0}
      onChangeTarget={setTarget}
      onClose={() => {}}
    />
  );
}

// ---------------------------------------------------------------------------
// Layout primitives for the catalog itself
// ---------------------------------------------------------------------------

/** A page-scoped divider grouping feature blocks by the page they belong to. */
function PageGroupHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-gray-200 pb-2 pt-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </h3>
  );
}

function Entry({
  name,
  source,
  usedIn,
  children,
}: {
  name: string;
  source: string;
  usedIn: string[];
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold text-gray-900">{name}</h2>
        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {source}
        </code>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
        {children}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <span className="font-medium text-gray-400">Used in:</span>
        {usedIn.map((loc) => (
          <span
            key={loc}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600"
          >
            {loc}
          </span>
        ))}
      </div>
    </section>
  );
}

function Swatch({
  label,
  children,
  dark = false,
  grow = false,
}: {
  label?: string;
  children: ReactNode;
  /** Render on a dark background (for on-primary variants). */
  dark?: boolean;
  /** Let the swatch fill the row width (inputs, empty states). */
  grow?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${grow ? "w-full" : ""}`}>
      <div
        className={`flex min-h-[44px] items-center justify-center rounded-md px-3 py-2 ${
          dark ? "bg-primary" : ""
        }`}
      >
        {children}
      </div>
      {label && (
        <code className="text-center text-[11px] text-gray-400">{label}</code>
      )}
    </div>
  );
}

/**
 * Descriptive-only catalog entry for components that are full-page shells or
 * data-fetching section wrappers — awkward to render live in isolation, so we
 * document their role, key props, where they're used, and any mobile note.
 */
function DescEntry({
  name,
  source,
  description,
  props,
  usedIn,
  mobileNote,
  preview,
}: {
  name: string;
  source: string;
  description: string;
  props: string[];
  usedIn: string[];
  mobileNote?: string;
  /** Optional live render of the component, shown in a bounded preview frame. */
  preview?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold text-gray-900">{name}</h2>
        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {source}
        </code>
      </div>

      <p className="mb-4 text-sm text-gray-600">{description}</p>

      {preview && (
        <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
          {preview}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {props.map((p) => (
          <code
            key={p}
            className="rounded bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-inset ring-gray-100"
          >
            {p}
          </code>
        ))}
      </div>

      {mobileNote && (
        <p className="mb-4 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
          <span className="font-semibold">Mobile:</span> {mobileNote}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <span className="font-medium text-gray-400">Used in:</span>
        {usedIn.map((loc) => (
          <span
            key={loc}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600"
          >
            {loc}
          </span>
        ))}
      </div>
    </section>
  );
}
