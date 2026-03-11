"use client";

import { useState, useMemo, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LessonActivity } from "@/lib/queries";
import { formatTime } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

type FilterType = "all" | "study" | "test";
type SortColumn = "index" | "date" | "type" | "wordsMastered" | "duration";
type SortDirection = "asc" | "desc";

interface LessonActivityHistoryProps {
  activities: LessonActivity[];
  counts: {
    all: number;
    study: number;
    test: number;
  };
  lessonId: string;
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

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMilestone(milestone?: string): string {
  if (!milestone) return "";
  // Capitalize first letter
  return milestone.charAt(0).toUpperCase() + milestone.slice(1) + " test";
}

export function LessonActivityHistory({
  activities,
  counts,
  lessonId,
  rightContent,
}: LessonActivityHistoryProps) {
  const router = useRouter();
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
    { id: "study", label: "Study Sessions", count: counts.study },
    { id: "test", label: "Tests", count: counts.test },
  ];

  const filteredAndSortedActivities = useMemo(() => {
    // First filter
    let filtered = filter === "all"
      ? [...activities]
      : activities.filter((a) => a.type === filter);

    // Then sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "index":
          // Index is just the original order, so we compare by date descending as default
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "wordsMastered":
          const aMastered = a.type === "test" ? (a.wordsMastered || 0) : -1;
          const bMastered = b.type === "test" ? (b.wordsMastered || 0) : -1;
          comparison = aMastered - bMastered;
          break;
        case "duration":
          comparison = a.durationSeconds - b.durationSeconds;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [activities, filter, sortColumn, sortDirection]);

  const handleTakeTest = () => {
    router.push(`/lesson/${lessonId}/test`);
  };

  return (
    <>
      {/* Filter tabs with optional right content */}
      <div className="mb-4 flex items-center justify-between">
        <Tabs
          tabs={tabs}
          activeTab={filter}
          onChange={(tabId) => setFilter(tabId as FilterType)}
        />
        {rightContent}
      </div>

      {/* Activity Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-[700px] w-full border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="whitespace-nowrap">
              <th className="w-[50px] px-6 py-3 text-left">
                <SortableHeader
                  label="#"
                  column="index"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-[140px] px-2 py-3 text-left">
                <SortableHeader
                  label="Date"
                  column="date"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-[160px] px-2 py-3 text-left">
                <SortableHeader
                  label="Session Type"
                  column="type"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-[120px] px-2 py-3 text-center">
                <SortableHeader
                  label="Words Mastered"
                  column="wordsMastered"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  centered
                />
              </th>
              <th className="w-[100px] px-2 py-3 text-center">
                <SortableHeader
                  label="Duration"
                  column="duration"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  centered
                />
              </th>
              <th className="w-[120px] px-2 py-3"></th>
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
                    "group transition-colors hover:bg-bone-hover",
                    index !== 0 && "border-t border-gray-200"
                  )}
                >
                  {/* Index */}
                  <td
                    className={cn(
                      "bg-white px-6 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover",
                      index === 0 && "rounded-tl-xl",
                      index === filteredAndSortedActivities.length - 1 && "rounded-bl-xl"
                    )}
                  >
                    {index + 1}
                  </td>

                  {/* Date */}
                  <td className="bg-white px-2 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
                    {formatDate(activity.date)}
                  </td>

                  {/* Session Type */}
                  <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          activity.type === "study" ? "bg-primary" : "bg-success"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-regular-medium text-foreground">
                          {activity.type === "study" ? "Study" : "Test"}
                        </span>
                        {activity.type === "test" && activity.milestone && (
                          <span className="text-xs text-muted-foreground">
                            {formatMilestone(activity.milestone)}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Words Mastered */}
                  <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
                    {activity.type === "test" ? activity.wordsMastered : "-"}
                  </td>

                  {/* Duration */}
                  <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
                    {formatTime(activity.durationSeconds)}
                  </td>

                  {/* Action */}
                  <td
                    className={cn(
                      "bg-white px-2 py-4 pr-6 text-right transition-colors group-hover:bg-bone-hover",
                      index === 0 && "rounded-tr-xl",
                      index === filteredAndSortedActivities.length - 1 && "rounded-br-xl"
                    )}
                  >
                    {activity.type === "test" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTakeTest}
                        className="border-primary text-primary hover:bg-primary/5"
                      >
                        Take test
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
