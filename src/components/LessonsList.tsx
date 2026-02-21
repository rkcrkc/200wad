"use client";

import { useState, useMemo } from "react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { LessonRow } from "@/components/LessonRow";
import { LessonWithProgress, LessonStatus } from "@/lib/queries";

type FilterType = "all" | "not-started" | "studying" | "mastered";

interface LessonsListProps {
  lessons: LessonWithProgress[];
  languageFlag?: string;
}

export function LessonsList({ lessons, languageFlag }: LessonsListProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  // Count lessons by status
  const counts = useMemo(() => {
    return {
      all: lessons.length,
      "not-started": lessons.filter((l) => l.status === "not-started").length,
      studying: lessons.filter((l) => l.status === "studying").length,
      mastered: lessons.filter((l) => l.status === "mastered").length,
    };
  }, [lessons]);

  // Filter lessons
  const filteredLessons = useMemo(() => {
    if (filter === "all") return lessons;
    return lessons.filter((lesson) => lesson.status === filter);
  }, [lessons, filter]);

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

        {languageFlag && <div className="text-2xl">{languageFlag}</div>}
      </div>

      {/* Lessons Table */}
      <div>
        {/* Table Header */}
        <div className="flex items-center justify-between gap-6 px-6 py-3">
          <div className="text-small-medium text-black-50">Lesson</div>
          <div className="flex items-center gap-6">
            <div className="w-[160px] text-small-medium text-black-50">Status</div>
            <div className="w-[100px] text-center text-small-medium text-black-50">
              # Words
            </div>
            <div className="w-[100px] text-center text-small-medium text-black-50">
              # Mastered
            </div>
            <div className="w-[140px] text-center text-small-medium text-black-50">
              Completion
            </div>
            <div className="w-5"></div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
          {filteredLessons.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground">
                No lessons match this filter.
              </p>
              <button
                onClick={() => setFilter("all")}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Show all lessons
              </button>
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
