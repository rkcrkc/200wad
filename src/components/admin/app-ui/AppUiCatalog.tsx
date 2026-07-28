"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { MobileFloatingBar } from "@/components/ui/MobileFloatingBar";
import { InlineSearch } from "@/components/InlineSearch";
import { Popover } from "@/components/ui/popover";
import { CourseStatsBar } from "@/components/CourseStatsBar";
import { SpecialLessonsRow } from "@/components/lessons/SpecialLessonsRow";
import { LessonsList } from "@/components/LessonsList";
import { TestsList } from "@/components/TestsList";
import { MobileStatsDropdown } from "@/components/ui/mobile-stats-dropdown";
import type { LessonForScheduler } from "@/lib/queries/schedule";
import type { LessonWithProgress } from "@/lib/queries/lessons";
import type { TestForList } from "@/lib/queries/tests";
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
}: {
  children: ReactNode;
  width?: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(320);

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

  // Auto-size the frame height to its content.
  useEffect(() => {
    if (!body) return;
    const update = () => setHeight(body.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(body);
    return () => ro.disconnect();
  }, [body]);

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
          <div className="bg-background p-3">{children}</div>,
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
        ]}
        usedIn={["All Lessons page header"]}
        mobileNote="The four-stat row wraps raggedly on a phone, so mobile shows only the first stat inline with a down-caret; tapping opens a dropdown listing the other three vertically. Desktop keeps the full row + per-stat popovers."
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
        mobileNote="Below md the row collapses to a single visible cell — every other td, the action cell included, is display:none, so no column reserves width. The chevron (or lock) rides inside the lesson cell's flex line, and that cell also takes the table's corner rounding (the number and action cells reclaim it at md). The emoji tile drops to 32px. The four numeric columns, the status column and the study/test shortcuts are dropped (status moves into a meta sub-row with XP and the word count), the table's min-width becomes md-only so it fits the viewport, and the stats toggle is hidden. Row tap opens the lesson."
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
