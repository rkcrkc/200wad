"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown, ClipboardCheck } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { LessonRow } from "@/components/LessonRow";
import { QaLessonRow } from "@/components/QaLessonRow";
import { InlineSearch } from "@/components/InlineSearch";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  QA_FLAG_DEFINITIONS,
  createQaLessonId,
  type QaFlag,
} from "@/lib/queries/qa-lessons";
import type { LessonWithProgress } from "@/lib/queries/lessons";
import type { LessonMilestoneScores } from "@/lib/queries/tests";
import { useScrollFade } from "@/hooks/useScrollFade";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { PricingPlan } from "@/types/database";
import type { PricingTierCopyMap } from "@/lib/queries/subscriptions";
import { useText } from "@/context/TextContext";

type FilterType = "all" | "not-started" | "learning" | "learned" | "mastered" | "developer_notes";
type SortColumn = "number" | "title" | "word_count" | "wordsLearned" | "wordsMastered" | "initial" | "day" | "week" | "month" | "qtr" | "year" | "other" | "overall";
type SortDirection = "asc" | "desc";

interface LessonsListProps {
  lessons: LessonWithProgress[];
  languageFlag?: string;
  languageName?: string;
  languageId?: string;
  milestoneScores?: Map<string, LessonMilestoneScores>;
  plans?: PricingPlan[];
  enabledTiers?: string[];
  /** Admin-editable upgrade-modal card copy keyed by tier. */
  copy?: PricingTierCopyMap;
  /**
   * Per-flag count of developer-flagged words in this course. Passed ONLY for
   * admins (the server component gates on this), which is what surfaces the
   * admin-only "Developer notes" filter pill and its QA lesson rows.
   */
  qaFlagCounts?: Record<QaFlag, number>;
  /** Course id, needed to build QA study hrefs. */
  courseId?: string;
}

interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  centered?: boolean;
}

function SortableHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  centered = false,
}: SortableHeaderProps) {
  const isActive = currentColumn === column;

  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        "flex cursor-pointer items-center gap-0.5 whitespace-nowrap transition-colors hover:text-foreground",
        centered && "justify-center",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
      style={{ fontSize: "13px", fontWeight: 500 }}
    >
      <span>{label}</span>
      {isActive && (
        direction === "asc" ? (
          <ChevronUp className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0" />
        )
      )}
    </button>
  );
}

export function LessonsList({ lessons, languageFlag, languageName, languageId, milestoneScores, plans, enabledTiers, copy, qaFlagCounts, courseId }: LessonsListProps) {
  const { t } = useText();
  const { scrollRef, canScrollRight } = useScrollFade();
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showStats, setShowStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open the UpgradeModal when arriving via a redirect from a locked
  // lesson (e.g. clicking the lesson chip in the word-preview sidebar header).
  // The redirect carries `?upgrade-lesson=<lessonId>`. We resolve it lazily on
  // first render, then strip the param so refresh doesn't re-open the modal.
  const [lockedLesson, setLockedLesson] = useState<LessonWithProgress | null>(
    () => {
      if (typeof window === "undefined") return null;
      const params = new URLSearchParams(window.location.search);
      const lessonId = params.get("upgrade-lesson");
      if (!lessonId) return null;
      return lessons.find((l) => l.id === lessonId) ?? null;
    }
  );

  useEffect(() => {
    if (!searchParams.get("upgrade-lesson")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("upgrade-lesson");
    const qs = params.toString();
    const newPath = window.location.pathname + (qs ? `?${qs}` : "");
    router.replace(newPath, { scroll: false });
  }, [router, searchParams]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Count lessons by status
  const counts = useMemo(() => {
    return {
      all: lessons.length,
      "not-started": lessons.filter((l) => l.status === "not-started").length,
      learning: lessons.filter((l) => l.status === "learning").length,
      learned: lessons.filter((l) => l.status === "learned").length,
      mastered: lessons.filter((l) => l.status === "mastered").length,
    };
  }, [lessons]);

  // Filter and sort lessons
  const filteredAndSortedLessons = useMemo(() => {
    // First filter by status
    let filtered = filter === "all"
      ? [...lessons]
      : lessons.filter((lesson) => lesson.status === filter);

    // Then filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((lesson) =>
        lesson.title.toLowerCase().includes(query)
      );
    }

    // Then sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "number":
          comparison = a.number - b.number;
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "word_count":
          comparison = (a.word_count || 0) - (b.word_count || 0);
          break;
        case "wordsLearned":
          comparison = (a.wordsLearned || 0) - (b.wordsLearned || 0);
          break;
        case "wordsMastered":
          comparison = (a.wordsMastered || 0) - (b.wordsMastered || 0);
          break;
        case "initial":
        case "day":
        case "week":
        case "month":
        case "qtr":
        case "year":
        case "other":
        case "overall":
          // Inlined milestone lookup (rather than a render-scope helper) so
          // the compiler can preserve this useMemo. `milestoneScores` is in deps.
          const aScore = milestoneScores?.get(a.id)?.[sortColumn] ?? null;
          const bScore = milestoneScores?.get(b.id)?.[sortColumn] ?? null;
          // Treat null as -1 so they sort to the end
          comparison = (aScore ?? -1) - (bScore ?? -1);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [lessons, filter, searchQuery, sortColumn, sortDirection, milestoneScores]);

  // Admin-only QA lessons (one per developer-QA flag). Present only when the
  // server passed `qaFlagCounts` (i.e. the viewer is an admin). Study-only and
  // ephemeral; zero-count rows render greyed.
  const qaLessons = useMemo(() => {
    if (!qaFlagCounts || !courseId) return [];
    return QA_FLAG_DEFINITIONS.map((def) => {
      const count = qaFlagCounts[def.key] ?? 0;
      return {
        key: def.key,
        emoji: def.emoji,
        label: def.label,
        count,
        lessonId: count > 0 ? createQaLessonId(def.key, courseId) : undefined,
      };
    });
  }, [qaFlagCounts, courseId]);

  const showQaTab = qaLessons.length > 0;
  const isQaView = filter === "developer_notes";

  const allTabs: Tab[] = [
    { id: "all", label: "All lessons", count: counts.all },
    { id: "not-started", label: "Not started", count: counts["not-started"] },
    { id: "learning", label: "Learning", count: counts.learning },
    { id: "learned", label: "Learned", count: counts.learned },
    { id: "mastered", label: "Mastered", count: counts.mastered },
  ];

  // Hide tabs with zero items (except "all" which always shows)
  const visibleTabs = allTabs.filter((tab) => tab.id === "all" || (tab.count ?? 0) > 0);

  // Append the admin-only QA pill last. Count = number of QA lessons that have
  // words; always shown for admins (even at 0) so the section is discoverable.
  const tabs: Tab[] = showQaTab
    ? [
        ...visibleTabs,
        {
          id: "developer_notes",
          label: "Developer notes",
          count: qaLessons.filter((q) => q.count > 0).length,
        },
      ]
    : visibleTabs;

  return (
    <>
      {/* Filter tabs — tabs scroll horizontally on overflow; the search icon
          stays pinned on the right so it never gets pushed off-screen. */}
      <div className="mb-4 flex items-center gap-3">
        {/* min-w-0 lets this flex item shrink below the tabs' content width so
            ScrollFadeRow's inner overflow-x-auto actually scrolls. */}
        <div className="min-w-0 flex-1">
          <Tabs
            tabs={tabs}
            activeTab={filter}
            onChange={(tabId) => setFilter(tabId as FilterType)}
            fadeClassName="from-background"
          />
        </div>

        {/* Search + stats toggle don't apply to the QA view (7 static rows). */}
        {!isQaView && (
          <div className="flex flex-shrink-0 items-center gap-3">
            <InlineSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Filter lessons..."
            />
            {/* Stats toggle button — the milestone-scores grid it reveals is a
                wide desktop-only view, so the toggle is hidden on mobile. */}
            <Tooltip label={showStats ? t("tip_show_progress_view") : t("tip_show_test_scores")}>
              <button
                onClick={() => setShowStats(!showStats)}
                className={cn(
                  "hidden h-9 w-9 items-center justify-center rounded-lg transition-colors md:flex",
                  showStats
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-beige"
                )}
              >
                <ClipboardCheck className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Lessons Table */}
      <div ref={scrollRef} className="overflow-x-auto pt-10 -mt-10">
        <table className={cn("w-full table-fixed border-separate border-spacing-0", isQaView ? "md:min-w-[600px]" : showStats ? "md:min-w-[900px]" : "md:min-w-[800px]")}>
          {/* Table Header — hidden on mobile for the default view, where the
              table reads as a list of rows (columns collapse into each row). */}
          <thead className={cn(!isQaView && !showStats && "hidden md:table-header-group")}>
            <tr className="cursor-default whitespace-nowrap">
              {isQaView ? (
                <>
                  {/* QA View Header (admin-only developer-flag lessons) */}
                  <th className="w-[40px] px-4 py-3 text-left text-xs-medium font-medium text-muted-foreground md:w-[50px] md:px-6">#</th>
                  <th className="px-2 py-3 text-left text-xs-medium font-medium text-muted-foreground">Lesson</th>
                  <th className="hidden w-[90px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground md:table-cell"># Words</th>
                  <th className={cn(
                    "sticky right-0 z-10 w-[140px] bg-background px-2 py-3",
                    canScrollRight && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-background"
                  )}></th>
                </>
              ) : showStats ? (
                <>
                  {/* Stats View Header */}
                  <th className="w-[50px] px-6 py-3 text-left">
                    <SortableHeader
                      label="#"
                      column="number"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-2 py-3 text-left">
                    <SortableHeader
                      label="Lesson"
                      column="title"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Initial"
                      column="initial"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Day"
                      column="day"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Week"
                      column="week"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Month"
                      column="month"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Qtr"
                      column="qtr"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Year"
                      column="year"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Other"
                      column="other"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Overall"
                      column="overall"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className={cn(
                    "sticky right-0 z-10 w-[110px] bg-background px-2 py-3",
                    canScrollRight && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-background"
                  )}></th>
                </>
              ) : (
                <>
                  {/* Default View Header — number column is desktop-only; on
                      mobile the number is prepended to the lesson title. */}
                  <th className="hidden w-[40px] px-4 py-3 text-left md:table-cell md:w-[50px] md:px-6">
                    <SortableHeader
                      label="#"
                      column="number"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-2 py-3 text-left">
                    <SortableHeader
                      label="Lesson"
                      column="title"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="hidden px-2 py-3 text-left text-xs-medium font-medium text-muted-foreground md:table-cell md:w-[140px]">Status</th>
                  <th className="hidden w-[60px] px-2 py-3 text-center md:table-cell">
                    <Tooltip
                      align="right"
                      label={
                        <span className="block whitespace-normal">
                          XP available — one perfect test scores 3 XP per word
                        </span>
                      }
                    >
                      <span
                        className="inline-flex items-center justify-center whitespace-nowrap text-muted-foreground"
                        style={{ fontSize: "13px", fontWeight: 500 }}
                      >
                        XP
                      </span>
                    </Tooltip>
                  </th>
                  <th className="hidden w-[90px] px-2 py-3 text-center md:table-cell">
                    <SortableHeader
                      label="# Words"
                      column="word_count"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="hidden w-[90px] px-2 py-3 text-center md:table-cell">
                    <SortableHeader
                      label="# Learned"
                      column="wordsLearned"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="hidden w-[90px] px-2 py-3 text-center md:table-cell">
                    <SortableHeader
                      label="# Mastered"
                      column="wordsMastered"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className={cn(
                    "sticky right-0 z-10 w-[140px] bg-background px-2 py-3",
                    canScrollRight && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-background"
                  )}></th>
                </>
              )}
            </tr>
          </thead>


          {/* Table Body */}
          {/* Corner rounding lives on the cells themselves (see LessonRow and
              QaLessonRow), driven by isFirst/isLast. Doing it here with
              `:nth-child`/`:last-child` breaks as soon as a cell is hidden at a
              breakpoint: those selectors are structural and still match
              `display:none` cells, so the radius lands on an invisible cell and
              the visible row renders square. */}
          <tbody className="shadow-card">
            {isQaView ? (
              qaLessons.every((q) => q.count === 0) ? (
                <tr>
                  <td colSpan={4} className="bg-white px-6 py-12 text-center">
                    <p className="text-muted-foreground">
                      No flagged words in this course.
                    </p>
                  </td>
                </tr>
              ) : (
                qaLessons.map((q, index) => (
                  <QaLessonRow
                    key={q.key}
                    index={index + 1}
                    emoji={q.emoji}
                    title={q.label}
                    count={q.count}
                    lessonId={q.lessonId}
                    isFirst={index === 0}
                    isLast={index === qaLessons.length - 1}
                    showScrollFade={canScrollRight}
                  />
                ))
              )
            ) : filteredAndSortedLessons.length === 0 ? (
              <tr>
                <td colSpan={showStats ? 11 : 8} className="px-6 py-12 text-center">
                  <p className="text-muted-foreground">
                    No lessons match this filter.
                  </p>
                  <button
                    onClick={() => setFilter("all")}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Show all lessons
                  </button>
                </td>
              </tr>
            ) : (
              filteredAndSortedLessons.map((lesson, index) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  isFirst={index === 0}
                  isLast={index === filteredAndSortedLessons.length - 1}
                  showStats={showStats}
                  milestoneScores={milestoneScores?.get(lesson.id)}
                  onLockedClick={setLockedLesson}
                  showScrollFade={canScrollRight}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upgrade Modal for locked lessons */}
      <UpgradeModal
        isOpen={lockedLesson !== null}
        onClose={() => setLockedLesson(null)}
        lessonTitle={lockedLesson?.title}
        languageName={languageName}
        languageFlag={languageFlag}
        languageId={languageId}
        plans={plans || []}
        enabledTiers={enabledTiers || []}
        originLessonId={lockedLesson?.id}
        copy={copy}
      />
    </>
  );
}
