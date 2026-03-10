"use client";

import { useState } from "react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { TestRow } from "@/components/TestRow";
import { TestForList } from "@/lib/queries/tests";
import { EmptyState } from "@/components/ui/empty-state";

type FilterType = "due" | "previous";

interface TestsListProps {
  dueTests: TestForList[];
  previousTests: TestForList[];
  languageFlag?: string;
}

export function TestsList({ dueTests, previousTests, languageFlag }: TestsListProps) {
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
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-[900px] w-full border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="whitespace-nowrap text-small-medium text-muted-foreground">
              <th className="w-[50px] px-6 py-3 text-left font-medium">#</th>
              <th className="min-w-[180px] px-2 py-3 text-left font-medium">Lesson</th>
              <th className="w-[100px] px-2 py-3 text-left font-medium">Test Name</th>
              <th className="w-[70px] px-2 py-3 text-center font-medium">Test #</th>
              <th className="w-[100px] px-2 py-3 text-left font-medium">Status</th>
              <th className="w-[80px] px-2 py-3 text-center font-medium"># Words</th>
              <th className="w-[80px] px-2 py-3 text-center font-medium"># Mastered</th>
              <th className="w-[100px] px-2 py-3 text-center font-medium">Completion</th>
              <th className="sticky right-0 w-[130px] bg-background px-2 py-3"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
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
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
