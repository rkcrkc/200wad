"use client";

import { useState } from "react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { TestRow } from "@/components/TestRow";
import { TestForList } from "@/lib/queries/tests";
import { Tooltip } from "@/components/ui/tooltip";
import { SubBadge } from "@/components/ui/sub-badge";
import { useScrollFade } from "@/hooks/useScrollFade";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/helpers";

type FilterType = "due" | "previous";

interface TestsListProps {
  dueTests: TestForList[];
  previousTests: TestForList[];
  averageScore?: number;
}

export function TestsList({ dueTests, previousTests, averageScore }: TestsListProps) {
  const [filter, setFilter] = useState<FilterType>("due");
  const { scrollRef, canScrollRight } = useScrollFade();

  const tabs: Tab[] = [
    { id: "due", label: "Tests Due", count: dueTests.length },
    { id: "previous", label: "Previous Tests", count: previousTests.length },
  ];

  const currentTests = filter === "due" ? dueTests : previousTests;

  return (
    <>
      {/* Filter tabs */}
      <div className="mb-4 flex items-center justify-between">
        <Tabs
          tabs={tabs}
          activeTab={filter}
          onChange={(tabId) => setFilter(tabId as FilterType)}
        />
      </div>

      {/* Tests Table */}
      <div ref={scrollRef} className="overflow-x-auto pt-10 -mt-10">
          {/* min-width is md-only so the table fits a phone viewport instead of
              forcing 960px of sideways scroll. */}
          <table className="w-full table-fixed border-separate border-spacing-0 md:min-w-[960px]">
          {/* Table Header — hidden on mobile, where the table reads as a list
              of rows rather than a grid of labelled columns. */}
          <thead className="hidden md:table-header-group">
            <tr className="h-12 cursor-default whitespace-nowrap text-xs-medium text-muted-foreground">
              <th className="w-[50px] px-6 py-3 text-left font-medium">#</th>
              <th className="px-2 py-3 text-left font-medium">Lesson</th>
              <th className="w-[90px] px-2 py-3 text-left font-medium">Test Name</th>
              <th className="w-[60px] px-2 py-3 text-center font-medium">Test #</th>
              <th className={cn(
                filter === "previous" ? "w-[110px]" : "w-[120px]",
                "px-2 py-3 text-left font-medium"
              )}>
                {filter === "previous" ? (
                  <Tooltip label="Average lesson test score" tappable>
                    <span className="inline-flex items-center gap-1.5">
                      Score
                      {averageScore != null && averageScore > 0 && (
                        <SubBadge variant="header">
                          {formatPercent(averageScore)}
                        </SubBadge>
                      )}
                    </span>
                  </Tooltip>
                ) : "Status"}
              </th>
              {/* Previous Tests only. Tests Due has no XP column — the XP on
                  offer is shown inside that row's Start test button. */}
              {filter === "previous" && (
                <th className="w-[80px] px-2 py-3 text-center font-medium">
                  <Tooltip
                    align="right"
                    tappable
                    label={
                      <span className="block whitespace-normal">
                        XP earned — 3 XP per word answered perfectly
                      </span>
                    }
                  >
                    <span>XP earned</span>
                  </Tooltip>
                </th>
              )}
              <th className="w-[90px] px-2 py-3 text-center font-medium"># Words</th>
              <th className={cn(
                filter === "previous" ? "w-[110px]" : "w-[90px]",
                "px-2 py-3 text-center font-medium"
              )}>{filter === "previous" ? "New Learned" : "# Learned"}</th>
              <th className={cn(
                filter === "previous" ? "w-[110px]" : "w-[90px]",
                "px-2 py-3 text-center font-medium"
              )}>{filter === "previous" ? "New Mastered" : "# Mastered"}</th>
              <th className={cn(
                "sticky right-0 z-10 w-[196px] bg-background px-2 py-3",
                canScrollRight && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-background"
              )}></th>
            </tr>
          </thead>

          {/* Table Body */}
          {/* Corner rounding lives on the cells themselves (see TestRow), driven
              by isFirst/isLast. Doing it here with `:nth-child`/`:last-child`
              breaks as soon as a cell is hidden at a breakpoint: those selectors
              are structural and still match `display:none` cells, so the radius
              lands on an invisible cell and the visible row renders square. */}
          <tbody className="shadow-card">
            {currentTests.length === 0 ? (
              <tr>
                {/* Tests Due drops the XP column, so it is one narrower. */}
                <td colSpan={filter === "previous" ? 10 : 9} className="px-6 py-12 text-center">
                  <p className="text-muted-foreground">
                    {filter === "due"
                      ? "No tests due — keep studying to unlock more tests!"
                      : "No tests taken yet — start with a lesson to take your first test."}
                  </p>
                </td>
              </tr>
            ) : (
              currentTests.map((test, index) => (
                <TestRow
                  key={test.testId || `${test.lessonId}-${index}`}
                  test={test}
                  isFirst={index === 0}
                  isLast={index === currentTests.length - 1}
                  showScore={filter === "previous"}
                  showScrollFade={canScrollRight}
                />
              ))
            )}
          </tbody>
          </table>
      </div>
    </>
  );
}
