"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LessonActivity } from "@/lib/queries";
import { formatTime } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

type FilterType = "all" | "study" | "test";

interface LessonActivityHistoryProps {
  activities: LessonActivity[];
  counts: {
    all: number;
    study: number;
    test: number;
  };
  lessonId: string;
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
  if (!milestone) return "Test";
  // Capitalize first letter
  return milestone.charAt(0).toUpperCase() + milestone.slice(1);
}

export function LessonActivityHistory({
  activities,
  counts,
  lessonId,
}: LessonActivityHistoryProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");

  const tabs: Tab[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "study", label: "Study Sessions", count: counts.study },
    { id: "test", label: "Tests", count: counts.test },
  ];

  const filteredActivities = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((a) => a.type === filter);
  }, [activities, filter]);

  const handleTakeTest = () => {
    router.push(`/lesson/${lessonId}/test`);
  };

  return (
    <>
      {/* Filter tabs */}
      <div className="mb-4">
        <Tabs
          tabs={tabs}
          activeTab={filter}
          onChange={(tabId) => setFilter(tabId as FilterType)}
        />
      </div>

      {/* Activity Table */}
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-[600px] w-full border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="whitespace-nowrap">
              <th className="w-[140px] px-6 py-3 text-left text-xs-medium font-medium text-muted-foreground">
                Date
              </th>
              <th className="w-[160px] px-2 py-3 text-left text-xs-medium font-medium text-muted-foreground">
                Activity
              </th>
              <th className="w-[120px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                Words Mastered
              </th>
              <th className="w-[100px] px-2 py-3 text-center text-xs-medium font-medium text-muted-foreground">
                Duration
              </th>
              <th className="w-[120px] px-2 py-3"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
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
              filteredActivities.map((activity, index) => (
                <tr
                  key={activity.id}
                  className={cn(
                    "group transition-colors hover:bg-bone-hover",
                    index !== 0 && "border-t border-gray-200"
                  )}
                >
                  {/* Date */}
                  <td
                    className={cn(
                      "bg-white px-6 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover",
                      index === 0 && "rounded-tl-xl",
                      index === filteredActivities.length - 1 && "rounded-bl-xl"
                    )}
                  >
                    {formatDate(activity.date)}
                  </td>

                  {/* Activity Type */}
                  <td className="bg-white px-2 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
                    {activity.type === "study" ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        Study
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        {formatMilestone(activity.milestone)}
                      </span>
                    )}
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
                      index === filteredActivities.length - 1 && "rounded-br-xl"
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
