"use client";

import { useState } from "react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { TestRow } from "@/components/TestRow";
import { TestForList } from "@/lib/queries/tests";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import { SubBadge } from "@/components/ui/sub-badge";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/helpers";

type FilterType = "due" | "previous";

interface TestsListProps {
  dueTests: TestForList[];
  previousTests: TestForList[];
  languageFlag?: string;
  averageScore?: number;
}

export function TestsList({ dueTests, previousTests, languageFlag, averageScore }: TestsListProps) {
  const [filter, setFilter] = useState<FilterType>("due");

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

        {languageFlag && <div className="text-2xl">{languageFlag}</div>}
      </div>

      {/* Tests Table */}
      <div className="overflow-x-auto pt-10 -mt-10">
        <table className="min-w-[950px] w-full table-fixed border-separate border-spacing-0">
          {/* Table Header */}
          <thead>
            <tr className="cursor-default whitespace-nowrap text-xs-medium text-muted-foreground">
              <th className="w-[50px] px-6 py-3 text-left font-medium">#</th>
              <th className="px-2 py-3 text-left font-medium">Lesson</th>
              <th className="w-[90px] px-2 py-3 text-left font-medium">Test Name</th>
              <th className="w-[90px] px-2 py-3 text-center font-medium">Test #</th>
              <th className={cn(filter === "previous" ? "w-[110px]" : "w-[100px]", "px-2 py-3 text-left font-medium")}>
                {filter === "previous" ? (
                  <Tooltip label="Weighted average test score">
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
              <th className={cn(filter === "previous" ? "w-[80px]" : "w-[90px]", "px-2 py-3 text-center font-medium")}># Words</th>
              <th className={cn(filter === "previous" ? "w-[100px]" : "w-[90px]", "px-2 py-3 text-center font-medium")}>{filter === "previous" ? "New Learned" : "# Learned"}</th>
              <th className={cn(filter === "previous" ? "w-[100px]" : "w-[90px]", "px-2 py-3 text-center font-medium")}>{filter === "previous" ? "New Mastered" : "# Mastered"}</th>
              <th className="sticky right-0 z-10 w-[140px] bg-background px-2 py-3"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="shadow-card [&>tr:first-child>td:first-child]:rounded-tl-xl [&>tr:first-child>td:last-child]:rounded-tr-xl [&>tr:last-child>td:first-child]:rounded-bl-xl [&>tr:last-child>td:last-child]:rounded-br-xl">
            {currentTests.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
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
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
