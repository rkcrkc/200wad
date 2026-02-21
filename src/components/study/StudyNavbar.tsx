"use client";

import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimerDisplay } from "@/lib/utils/helpers";

interface StudyNavbarProps {
  languageFlag?: string;
  courseName?: string;
  elapsedSeconds: number;
  onExitLesson: () => void;
  /** Mode: "study" or "test" - affects badge styling and exit button text */
  mode?: "study" | "test";
  /** Lesson number and title shown in header */
  lessonNumber?: number;
  lessonTitle?: string;
}

export function StudyNavbar({
  languageFlag,
  courseName,
  elapsedSeconds,
  onExitLesson,
  mode = "study",
  lessonNumber,
  lessonTitle,
}: StudyNavbarProps) {
  const isTestMode = mode === "test";

  // Badge styling differs by mode
  const badgeBgColor = isTestMode ? "bg-[rgba(255,149,0,0.3)]" : "bg-[rgba(65,207,30,0.3)]";
  const badgeTextColor = isTestMode ? "text-[#E67E00]" : "text-[#22ac00]";
  const badgeText = isTestMode ? "Test mode" : "Study mode";
  const exitButtonText = isTestMode ? "Exit test" : "Exit lesson";

  return (
    <div className="fixed top-0 left-0 right-0 z-20 flex h-[72px] items-center justify-between bg-white px-6 pr-8">
      {/* Left side - Mode badge first, then lesson, timer */}
      <div className="flex items-center gap-4">
        {/* Mode badge */}
        <div className={`rounded-lg ${badgeBgColor} px-3 py-1.5`}>
          <span className={`text-regular-semibold ${badgeTextColor}`}>{badgeText}</span>
        </div>

        {/* Lesson name and number */}
        {lessonNumber != null && lessonTitle && (
          <span className="text-small-semibold text-foreground">
            Lesson #{lessonNumber}: {lessonTitle}
          </span>
        )}

        {/* Timer */}
        <div className="flex items-center gap-1.5 text-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-regular-semibold">{formatTimerDisplay(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Right side - Exit button */}
      <Button variant="outline" onClick={onExitLesson} className="gap-1.5">
        {exitButtonText}
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
