"use client";

import { useEffect, useState } from "react";
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
  needsReviewLessons: LessonForScheduler[];
  hasDueTests: boolean;
  courseId: string;
}

type TabId = "new" | "recent" | "needs-review";

function getDefaultTab(
  hasNew: boolean,
  hasNeedsReview: boolean
): TabId {
  if (hasNew) return "new";
  if (hasNeedsReview) return "needs-review";
  return "recent";
}

export function LessonGridSection({
  newLessons,
  recentLessons,
  needsReviewLessons,
  hasDueTests,
  courseId,
}: LessonGridSectionProps) {
  const showNew = newLessons.length > 0;
  const showRecent = recentLessons.length > 0;
  const showNeedsReview = needsReviewLessons.length > 0;

  const tabs: { id: TabId; label: string }[] = [];
  if (showNew) tabs.push({ id: "new", label: "New lessons" });
  if (showRecent) tabs.push({ id: "recent", label: "Recent lessons" });
  if (showNeedsReview) tabs.push({ id: "needs-review", label: "Needs review" });

  const [activeTab, setActiveTab] = useState<TabId>(() =>
    getDefaultTab(showNew, showNeedsReview)
  );

  // If the active tab is no longer rendered (e.g. needs-review emptied out
  // between renders), fall back to default-tab logic.
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(getDefaultTab(showNew, showNeedsReview));
    }
  }, [tabs, activeTab, showNew, showNeedsReview]);

  // Determine heading based on whether there are due tests
  const heading = hasDueTests ? "Or study a lesson" : "Or study something else";

  // Determine which lessons to show
  const displayLessons =
    activeTab === "new"
      ? newLessons
      : activeTab === "needs-review"
        ? needsReviewLessons
        : recentLessons;

  const showTabs = tabs.length >= 2;

  return (
    <section>
      {/* Header */}
      <div className={`${showTabs ? "mb-6" : "mb-8"} flex items-center justify-between`}>
        <h2 className="text-xxl2-semibold text-foreground">{heading}</h2>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`/course/${courseId}`}>
            All lessons
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Filter tabs */}
      {showTabs && (
        <div className="mb-4">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
          />
        </div>
      )}

      {/* Lesson Grid */}
      {displayLessons.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {displayLessons.slice(0, 6).map((lesson) => (
            <LessonPreviewCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            activeTab === "new"
              ? "You've started all available lessons"
              : activeTab === "needs-review"
                ? "Nothing to review right now"
                : "No recent lessons yet"
          }
          description={
            activeTab === "new"
              ? "Great job! Check your tests or review recent lessons."
              : activeTab === "needs-review"
                ? "You're all caught up. Come back later for review suggestions."
                : "Start studying to see your recent lessons here."
          }
        />
      )}
    </section>
  );
}
