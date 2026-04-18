"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ClipboardCheck } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { LessonRow } from "@/components/LessonRow";
import { InlineSearch } from "@/components/InlineSearch";
import { UpgradeModal } from "@/components/UpgradeModal";
import { LessonWithProgress, LessonMilestoneScores } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { PricingPlan } from "@/types/database";
import { useText } from "@/context/TextContext";

type FilterType = "all" | "not-started" | "learning" | "learned" | "mastered";
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

export function LessonsList({ lessons, languageFlag, languageName, languageId, milestoneScores, plans, enabledTiers }: LessonsListProps) {
  const { t } = useText();
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showStats, setShowStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lockedLesson, setLockedLesson] = useState<LessonWithProgress | null>(null);

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

  // Helper to get milestone score value (excludes lessonId which is a string)
  type MilestoneKey = Exclude<keyof LessonMilestoneScores, "lessonId">;
  const getMilestoneScore = (lessonId: string, milestone: MilestoneKey): number | null => {
    const scores = milestoneScores?.get(lessonId);
    return scores?.[milestone] ?? null;
  };

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
          const aScore = getMilestoneScore(a.id, sortColumn);
          const bScore = getMilestoneScore(b.id, sortColumn);
          // Treat null as -1 so they sort to the end
          comparison = (aScore ?? -1) - (bScore ?? -1);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [lessons, filter, searchQuery, sortColumn, sortDirection, milestoneScores]);

  const allTabs: Tab[] = [
    { id: "all", label: "All lessons", count: counts.all },
    { id: "not-started", label: "Not started", count: counts["not-started"] },
    { id: "learning", label: "Learning", count: counts.learning },
    { id: "learned", label: "Learned", count: counts.learned },
    { id: "mastered", label: "Mastered", count: counts.mastered },
  ];

  // Hide tabs with zero items (except "all" which always shows)
  const tabs = allTabs.filter((tab) => tab.id === "all" || (tab.count ?? 0) > 0);

  return (
    <>
      {/* Filter tabs */}
      <div className="mb-4 flex items-center justify-between">
        <Tabs
          tabs={tabs}
          activeTab={filter}
          onChange={(tabId) => setFilter(tabId as FilterType)}
        />

        <div className="flex items-center gap-3">
          <InlineSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Filter lessons..."
          />
          {/* Stats toggle button */}
          <Tooltip label={showStats ? t("tip_show_progress_view") : t("tip_show_test_scores")}>
            <button
              onClick={() => setShowStats(!showStats)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                showStats
                  ? "bg-primary text-white"
                  : "text-foreground hover:bg-beige"
              )}
            >
              <ClipboardCheck className="h-5 w-5" />
            </button>
          </Tooltip>
          {languageFlag && <div className="text-2xl">{languageFlag}</div>}
        </div>
      </div>

      {/* Lessons Table */}
      <div className="overflow-x-auto">
        <table className={cn("w-full table-fixed border-separate border-spacing-0", showStats ? "min-w-[900px]" : "min-w-[700px]")}>
          {/* Table Header */}
          <thead>
            <tr className="cursor-default whitespace-nowrap">
              {showStats ? (
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
                  <th className="sticky right-0 z-10 w-[110px] bg-background px-2 py-3"></th>
                </>
              ) : (
                <>
                  {/* Default View Header */}
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
                  <th className="w-[140px] px-2 py-3 text-left text-xs-medium font-medium text-muted-foreground">Status</th>
                  <th className="w-[90px] px-2 py-3 text-center">
                    <SortableHeader
                      label="# Words"
                      column="word_count"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[90px] px-2 py-3 text-center">
                    <SortableHeader
                      label="# Learned"
                      column="wordsLearned"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[90px] px-2 py-3 text-center">
                    <SortableHeader
                      label="# Mastered"
                      column="wordsMastered"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="sticky right-0 z-10 w-[140px] bg-background px-2 py-3"></th>
                </>
              )}
            </tr>
          </thead>


          {/* Table Body */}
          <tbody className="shadow-card [&>tr:first-child>td:first-child]:rounded-tl-xl [&>tr:first-child>td:last-child]:rounded-tr-xl [&>tr:last-child>td:first-child]:rounded-bl-xl [&>tr:last-child>td:last-child]:rounded-br-xl">
            {filteredAndSortedLessons.length === 0 ? (
              <tr>
                <td colSpan={showStats ? 11 : 7} className="px-6 py-12 text-center">
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
      />
    </>
  );
}
