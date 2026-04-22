"use client";

import { useState, useMemo, ReactNode } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { LessonActivity } from "@/lib/queries";
import { formatDuration, formatPercent } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";
import { SubBadge } from "@/components/ui/sub-badge";

type FilterType = "all" | "study" | "test";
type SortColumn = "index" | "date" | "score" | "duration";
type SortDirection = "asc" | "desc";

interface LessonActivityHistoryProps {
  activities: LessonActivity[];
  counts: {
    all: number;
    study: number;
    test: number;
  };
  /** Total word count for the lesson — used to detect partial study sessions. */
  lessonWordCount?: number;
  rightContent?: ReactNode;
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

function formatDate(dateString: string): { date: string; time: string } {
  if (!dateString) return { date: "-", time: "" };
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { date: dateStr, time: timeStr };
}

function formatMilestone(milestone?: string): string | null {
  if (!milestone || milestone === "other") return null;
  // Capitalize first letter
  return milestone.charAt(0).toUpperCase() + milestone.slice(1) + " test";
}

function formatTestScore(pointsEarned?: number, maxPoints?: number, scorePercent?: number): string {
  if (pointsEarned !== undefined && maxPoints !== undefined && maxPoints > 0) {
    return `${pointsEarned} / ${maxPoints} (${formatPercent(scorePercent ?? 0)})`;
  }
  return formatPercent(scorePercent ?? 0);
}

function formatDetailedDuration(seconds: number): string {
  if (seconds === 0) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

export function LessonActivityHistory({
  activities,
  counts,
  lessonWordCount,
  rightContent,
}: LessonActivityHistoryProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const tabs: Tab[] = [
    { id: "all", label: "All sessions", count: counts.all },
    { id: "test", label: "Test sessions", count: counts.test },
    { id: "study", label: "Study sessions", count: counts.study },
  ];

  const filteredAndSortedActivities = useMemo(() => {
    // First filter
    let filtered = filter === "all"
      ? [...activities]
      : activities.filter((a) => a.type === filter);

    // Sort by date ascending to assign chronological index within this filtered set
    filtered.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Assign index based on chronological order within the filtered set
    const withIndex = filtered.map((activity, idx) => ({
      ...activity,
      chronologicalIndex: idx + 1,
    }));

    // Then apply user's sort preference
    withIndex.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "index":
          comparison = a.chronologicalIndex - b.chronologicalIndex;
          break;
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "score":
          const aScore = a.type === "test" ? (a.scorePercent || 0) : -1;
          const bScore = b.type === "test" ? (b.scorePercent || 0) : -1;
          comparison = aScore - bScore;
          break;
        case "duration":
          comparison = a.durationSeconds - b.durationSeconds;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return withIndex;
  }, [activities, filter, sortColumn, sortDirection]);

  return (
    <div>
      {/* Filter tabs with optional right content */}
      <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
        <Tabs
          tabs={tabs}
          activeTab={filter}
          onChange={(tabId) => setFilter(tabId as FilterType)}
        />
        <div className="flex items-center gap-1">
          {rightContent}
        </div>
      </div>

      {/* Activity Table */}
      <div className="overflow-x-auto pt-10 -mt-10 rounded-xl">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "60px" }} />
            <col style={{ width: "240px" }} />
            <col style={{ width: "200px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "180px" }} />
            <col />
          </colgroup>
          {/* Table Header */}
          <thead>
            <tr className="h-12 whitespace-nowrap">
              <th className="px-6 py-3 text-left">
                <SortableHeader
                  label="#"
                  column="index"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-3 text-left">
                <SortableHeader
                  label="Date"
                  column="date"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-3 text-left text-xs-medium font-medium text-muted-foreground">
                Session Type
              </th>
              <th className="px-3 py-3 text-left">
                <SortableHeader
                  label="Duration"
                  column="duration"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-3 text-left">
                {filter !== "study" ? (
                  <SortableHeader
                    label="Score"
                    column="score"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                ) : (
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs-medium font-medium text-muted-foreground opacity-0">Score</span>
                  </div>
                )}
              </th>
              <th className="px-3 py-3 text-left"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredAndSortedActivities.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-muted-foreground">
                    {filter === "all"
                      ? "No activity yet for this lesson."
                      : filter === "study"
                        ? "No study sessions yet."
                        : "No tests taken yet."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredAndSortedActivities.map((activity, index) => (
                <tr
                  key={activity.id}
                  className={cn(
                    "group cursor-default transition-colors hover:bg-bone-hover",
                    index !== 0 && "border-t border-bone-hover"
                  )}
                >
                  {/* Index (chronological order) */}
                  <td
                    className={cn(
                      "bg-white px-6 py-5 text-small-medium text-foreground transition-colors group-hover:bg-bone-hover",
                      index === 0 && "rounded-tl-xl",
                      index === filteredAndSortedActivities.length - 1 && "rounded-bl-xl"
                    )}
                    style={{ fontVariantNumeric: "normal", fontWeight: 500, fontSize: "14px" }}
                  >
                    {activity.chronologicalIndex}
                  </td>

                  {/* Date */}
                  <td className="bg-white px-3 py-5 text-small-medium transition-colors group-hover:bg-bone-hover">
                    {(() => {
                      const { date, time } = formatDate(activity.date);
                      return (
                        <span className="text-foreground">
                          {date}
                          {time && <span className="text-xs text-muted-foreground"> • {time}</span>}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Session Type */}
                  <td className="bg-white px-3 py-5 text-small-medium transition-colors group-hover:bg-bone-hover">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          activity.type === "study" ? "bg-primary" : "bg-success"
                        )}
                      />
                      <span className="text-foreground">
                        {activity.type === "study" ? "Study" : "Test"}
                        {activity.type === "study" && lessonWordCount && activity.wordsStudied != null && activity.wordsStudied < lessonWordCount && (
                          <span className="text-xs text-muted-foreground">
                            {" "}• Partial ({activity.wordsStudied} words)
                          </span>
                        )}
                        {activity.type === "test" && activity.isRetest && (
                          <span className="text-xs text-muted-foreground">
                            {" "}• Retest{activity.totalQuestions ? ` (${activity.totalQuestions} words)` : ""}
                          </span>
                        )}
                        {activity.type === "test" && !activity.isRetest && formatMilestone(activity.milestone) && (
                          <span className="text-xs text-muted-foreground"> • {formatMilestone(activity.milestone)}</span>
                        )}
                      </span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="bg-white px-3 py-5 text-small-medium text-foreground transition-colors group-hover:bg-bone-hover">
                    {formatDetailedDuration(activity.durationSeconds)}
                  </td>

                  {/* Score - always present but content hidden for study filter */}
                  <td className="bg-white px-3 py-5 text-small-medium text-foreground transition-colors group-hover:bg-bone-hover">
                    {filter !== "study" ? (
                      activity.type === "test" && activity.pointsEarned !== undefined && activity.maxPoints !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span>{activity.pointsEarned} / {activity.maxPoints}</span>
                          <SubBadge>
                            {formatPercent(activity.scorePercent ?? 0)}
                          </SubBadge>
                        </div>
                      ) : (
                        "-"
                      )
                    ) : (
                      <span className="opacity-0">-</span>
                    )}
                  </td>

                  {/* Empty column for remaining space */}
                  <td
                    className={cn(
                      "bg-white px-3 py-5 transition-colors group-hover:bg-bone-hover",
                      index === 0 && "rounded-tr-xl",
                      index === filteredAndSortedActivities.length - 1 && "rounded-br-xl"
                    )}
                  ></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
