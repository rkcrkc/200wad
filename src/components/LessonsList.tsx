"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, BarChart3 } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { LessonRow } from "@/components/LessonRow";
import { LessonWithProgress, LessonMilestoneScores } from "@/lib/queries";
import { cn } from "@/lib/utils";

type FilterType = "all" | "not-started" | "studying" | "mastered";
type SortColumn = "number" | "title" | "word_count" | "wordsMastered" | "completionPercent";
type SortDirection = "asc" | "desc";

interface LessonsListProps {
  lessons: LessonWithProgress[];
  languageFlag?: string;
  milestoneScores?: Map<string, LessonMilestoneScores>;
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
        "flex items-center gap-0.5 whitespace-nowrap transition-colors hover:text-foreground",
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

export function LessonsList({ lessons, languageFlag, milestoneScores }: LessonsListProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showStats, setShowStats] = useState(false);

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
      studying: lessons.filter((l) => l.status === "studying").length,
      mastered: lessons.filter((l) => l.status === "mastered").length,
    };
  }, [lessons]);

  // Filter and sort lessons
  const filteredAndSortedLessons = useMemo(() => {
    // First filter
    const filtered = filter === "all"
      ? [...lessons]
      : lessons.filter((lesson) => lesson.status === filter);

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
        case "wordsMastered":
          comparison = (a.wordsMastered || 0) - (b.wordsMastered || 0);
          break;
        case "completionPercent":
          comparison = (a.completionPercent || 0) - (b.completionPercent || 0);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [lessons, filter, sortColumn, sortDirection]);

  const tabs: Tab[] = [
    { id: "all", label: "All lessons", count: counts.all },
    { id: "not-started", label: "Not started", count: counts["not-started"] },
    { id: "studying", label: "Studying", count: counts.studying },
    { id: "mastered", label: "Mastered", count: counts.mastered },
  ];

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
          {/* Stats toggle button */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              showStats
                ? "bg-primary text-white"
                : "bg-white text-muted-foreground hover:bg-gray-50 hover:text-foreground"
            )}
            title={showStats ? "Show progress view" : "Show test scores"}
          >
            <BarChart3 className="h-5 w-5" />
          </button>
          {languageFlag && <div className="text-2xl">{languageFlag}</div>}
        </div>
      </div>

      {/* Lessons Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className={cn("w-full border-collapse", showStats ? "min-w-[900px]" : "min-w-[700px]")}>
          {/* Table Header */}
          <thead>
            <tr className="whitespace-nowrap">
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
                  <th className="min-w-[200px] px-2 py-3 text-left text-xs-medium font-medium text-muted-foreground">
                    Lesson
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                    Initial
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                    Day
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                    Week
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                    Month
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                    Qtr
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                    Year
                  </th>
                  <th className="w-[70px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                    Overall
                  </th>
                  <th className="sticky right-0 w-[32px] bg-background px-2 py-3"></th>
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
                  <th className="min-w-[200px] px-2 py-3 text-left">
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
                      label="# Mastered"
                      column="wordsMastered"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="w-[110px] px-2 py-3 text-center">
                    <SortableHeader
                      label="Completion"
                      column="completionPercent"
                      currentColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                      centered
                    />
                  </th>
                  <th className="sticky right-0 w-[32px] bg-background px-2 py-3"></th>
                </>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredAndSortedLessons.length === 0 ? (
              <tr>
                <td colSpan={showStats ? 10 : 7} className="px-6 py-12 text-center">
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
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
