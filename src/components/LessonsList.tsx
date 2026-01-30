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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-[80px_minmax(300px,1fr)_160px_100px_100px_140px_60px] items-center gap-6 border-b border-gray-200 bg-[#FAF8F3] px-6 py-3">
          <div className="text-xs-medium text-muted-foreground">#</div>
          <div className="text-xs-medium text-muted-foreground">Lesson</div>
          <div className="text-xs-medium text-muted-foreground">Status</div>
          <div className="text-center text-xs-medium text-muted-foreground">
            # Words
          </div>
          <div className="text-center text-xs-medium text-muted-foreground">
            # Mastered
          </div>
          <div className="text-center text-xs-medium text-muted-foreground">
            Completion
          </div>
          <div></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
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
