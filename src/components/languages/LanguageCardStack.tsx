"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { CourseAccordionCard } from "@/components/languages/CourseAccordionCard";
import { LanguageCardActions } from "@/components/languages/LanguageCardActions";
import { ManageLanguagesMenu } from "@/components/languages/ManageLanguagesMenu";
import { getFlagFromCode } from "@/lib/utils/flags";
import { cn } from "@/lib/utils";
import type { CourseWithExpansion } from "@/lib/queries/languageCourses.types";
import type { LanguageWithProgress } from "@/lib/queries";

export interface LanguageCardItem {
  language: LanguageWithProgress;
  /** This language's courses, each with its expansion (loaded server-side). */
  courses: CourseWithExpansion[];
}

/**
 * A horizontal, scrollable row of selectable language cards (flag, name, course
 * count, completion ring). Selecting a card reveals that language's courses in a
 * stacked panel beneath the row. Selection sticks: re-clicking the active card
 * keeps it open. When `manageLanguages` is provided, a trailing "Manage
 * languages" card lets the user enrol/unenrol languages.
 */
export function LanguageCardStack({
  items,
  defaultSelectedId = null,
  manageLanguages,
}: {
  items: LanguageCardItem[];
  /** Language selected on first render (e.g. the current one). */
  defaultSelectedId?: string | null;
  /** All languages, enabling the trailing enrol/unenrol menu when provided. */
  manageLanguages?: LanguageWithProgress[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);
  const [view, setView] = useState<"list" | "grid">("list");
  const selected = items.find((i) => i.language.id === selectedId) ?? null;

  // Enrolled languages can't drop below one (removal is blocked server-side),
  // so gate the per-card "Remove" action on there being a spare.
  const enrolledCount = items.filter((i) => i.language.isEnrolled).length;

  return (
    <div>
      <div className="flex flex-wrap items-stretch gap-3">
        {items.map(({ language }) => {
          const flag = getFlagFromCode(language.code);
          const isSelected = language.id === selectedId;
          return (
            // The whole card selects the language via a full-bleed overlay
            // button; the trailing actions control sits above it so the two
            // interactive targets never nest.
            <div
              key={language.id}
              className={cn(
                "relative flex min-h-44 w-full flex-col rounded-2xl border bg-white shadow-card transition-all md:min-h-0 md:w-52 md:shrink-0",
                isSelected
                  ? "border-primary ring-2 ring-primary"
                  : "border-black/5 hover:border-black/15 hover:shadow-card-hover"
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedId((current) =>
                    current === language.id ? null : language.id
                  )
                }
                aria-pressed={isSelected}
                aria-label={`Show ${language.name} courses`}
                className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <div className="pointer-events-none relative z-10 flex flex-1 flex-col justify-between gap-3 p-4">
                <div className="flex items-start justify-between">
                  <span className="text-3xl leading-none">{flag}</span>
                  <div className="flex items-center gap-1">
                    <ProgressRing
                      value={language.progressPercent}
                      size={44}
                      showValue
                    />
                    <div className="pointer-events-auto">
                      <LanguageCardActions
                        language={language}
                        canRemove={enrolledCount > 1}
                      />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-large-semibold">
                    {language.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language.courseCount}{" "}
                    {language.courseCount === 1 ? "course" : "courses"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {manageLanguages && <ManageLanguagesMenu languages={manageLanguages} />}
      </div>

      {selected && (
        <div className="mt-6">
          {/* Courses header: title + list/grid view toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-small-semibold text-muted-foreground">
              {selected.language.name} courses ({selected.courses.length})
            </h3>
            <div className="flex items-center gap-0.5 rounded-lg p-0.5">
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === "list"
                    ? "bg-beige text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === "grid"
                    ? "bg-beige text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {selected.courses.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No courses available yet.
            </p>
          ) : (
            <div className="mt-4 space-y-7">
              {selected.courses.map(({ course, expansion }) => (
                <CourseAccordionCard
                  key={course.id}
                  course={course}
                  expansion={expansion}
                  view={view}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
