"use client";

import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFlagFromCode } from "@/lib/utils/flags";
import type { SubscriptionLanguage } from "@/lib/queries/subscriptions";
import { ExpandableCourseList } from "./ExpandableCourseList";

interface LanguageSubscriptionRowProps {
  lang: SubscriptionLanguage;
  /** Language is already fully accessible (individual or all-languages sub). */
  accessUnlocked: boolean;
  /** Whether to show the per-row "Unlock all lessons" CTA (free plan only). */
  showUnlockCta: boolean;
  /** Whether this language is the plan currently in the checkout cart. */
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUnlock: () => void;
}

export function LanguageSubscriptionRow({
  lang,
  accessUnlocked,
  showUnlockCta,
  isSelected,
  isExpanded,
  onToggleExpand,
  onUnlock,
}: LanguageSubscriptionRowProps) {
  const lockedLessons = Math.max(0, lang.totalLessons - lang.freeLessons);

  return (
    <div>
      <div className={`px-8 py-5 ${isExpanded ? "border-b border-bone-hover" : ""}`}>
        <div className="grid items-center grid-cols-[minmax(0,240px)_minmax(0,180px)_1fr_220px_40px]">
          {/* Language */}
          <div className="flex items-center gap-3">
            <span className="text-xl">{getFlagFromCode(lang.code)}</span>
            <span className="text-medium-semibold">{lang.name}</span>
          </div>

          {/* Courses */}
          <div className="text-small-regular text-muted-foreground">
            {lang.courseCount} {lang.courseCount === 1 ? "course" : "courses"}
          </div>

          {/* Access */}
          <div className="flex items-center">
            {accessUnlocked ? (
              <span className="text-small-medium text-green-600">Unlocked</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-small-regular text-muted-foreground">
                  {lang.totalLessons} {lang.totalLessons === 1 ? "lesson" : "lessons"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-small-medium text-warning">
                  <Lock className="h-3 w-3 shrink-0" />
                  {lockedLessons} locked
                </span>
              </div>
            )}
          </div>

          {/* Action */}
          <div className="flex items-center pr-4">
            {showUnlockCta &&
              (isSelected ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onUnlock}
                  className="w-full text-primary"
                >
                  Selected
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={onUnlock}
                  className="group w-full"
                >
                  Unlock {lang.name}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              ))}
          </div>

          {/* Chevron */}
          <div className="flex items-center justify-end">
            <button
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Collapse courses" : "Expand courses"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-beige"
            >
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <ExpandableCourseList courses={lang.courses} isUnlocked={accessUnlocked} />
      )}
    </div>
  );
}
