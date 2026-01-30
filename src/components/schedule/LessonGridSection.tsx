"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { LessonPreviewCard } from "./LessonPreviewCard";
import type { LessonForScheduler } from "@/lib/queries";

interface LessonGridSectionProps {
  newLessons: LessonForScheduler[];
  recentLessons: LessonForScheduler[];
  hasDueTests: boolean;
  courseId: string;
}

export function LessonGridSection({
  newLessons,
  recentLessons,
  hasDueTests,
  courseId,
}: LessonGridSectionProps) {
  const [activeTab, setActiveTab] = useState<string>("new");

  // Determine heading based on whether there are due tests
  const heading = hasDueTests ? "Or study a lesson" : "Or study something else";

  // Determine which lessons to show
  const displayLessons = activeTab === "new" ? newLessons : recentLessons;

  // Only show tabs if there are recent lessons
  const showTabs = recentLessons.length > 0;

  const tabs = [
    { id: "new", label: "New lessons" },
    { id: "recent", label: "Recent lessons" },
  ];

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">{heading}</h2>
          {showTabs && (
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/lessons/${courseId}`}>
            All lessons
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Lesson Grid */}
      {displayLessons.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {displayLessons.slice(0, 4).map((lesson) => (
            <LessonPreviewCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            activeTab === "new"
              ? "You've started all available lessons"
              : "No recent lessons yet"
          }
          description={
            activeTab === "new"
              ? "Great job! Check your tests or review recent lessons."
              : "Start studying to see your recent lessons here."
          }
        />
      )}
    </section>
  );
}
