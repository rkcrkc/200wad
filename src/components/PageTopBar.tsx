"use client";

import Link from "next/link";
import { ChevronLeft, ChevronsLeftRight, ChevronsRightLeft } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useText } from "@/context/TextContext";
import { getTimeOfDay, type TimeOfDay } from "@/lib/greeting";
import type { LanguageGreetings } from "@/types/database";
import { cn } from "@/lib/utils";

export type { TimeOfDay };

const TIME_OF_DAY_EMOJI: Record<TimeOfDay, string> = {
  morning: "👋",
  afternoon: "☀️",
  evening: "🌙",
};

const ENGLISH_FALLBACK: Record<TimeOfDay, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

interface PageTopBarProps {
  backLink?: { href: string; label: string };
  /** Per-language greetings from the DB; `null` uses the English fallback. Omit for pages without a greeting. */
  greetings?: LanguageGreetings | null;
  greetingUserName?: string | null;
  /** Server-computed time-of-day, used only for the first (pre-hydration) render. */
  initialTimeOfDay?: TimeOfDay;
  width: "md" | "lg";
  onToggleWidth: () => void;
  mounted: boolean;
}

export function PageTopBar({
  backLink,
  greetings,
  greetingUserName,
  initialTimeOfDay = "afternoon",
  width,
  onToggleWidth,
  mounted,
}: PageTopBarProps) {
  const { t } = useText();

  // Before hydration we render the server-computed time-of-day (deterministic,
  // so no hydration mismatch). Once mounted, `getTimeOfDay()` reads the browser
  // clock so the greeting matches the user's local time, not the server's.
  const timeOfDay = mounted ? getTimeOfDay() : initialTimeOfDay;

  const hasGreeting = greetings !== undefined;
  const suffix = greetingUserName ? `, ${greetingUserName}` : "";
  const entry = greetings?.[timeOfDay];
  const greeting = hasGreeting
    ? entry
      ? `${entry.text}${suffix}`
      : `${ENGLISH_FALLBACK[timeOfDay]}${suffix}`
    : undefined;
  const greetingTranslation = entry?.translation ? `${entry.translation}${suffix}` : undefined;
  const greetingEmoji = TIME_OF_DAY_EMOJI[timeOfDay];
  // When there's no greeting/back link the bar exists only to hold the desktop
  // width toggle — which is hidden on mobile — so the whole row collapses on
  // phones rather than leaving an empty gap.
  const hasLeadContent = Boolean(greeting || backLink);
  return (
    <div
      className={cn(
        "mb-6 items-center justify-between",
        hasLeadContent ? "flex" : "hidden md:flex"
      )}
    >
      {/* Left: greeting or back link */}
      {greeting ? (
        greetingTranslation ? (
          <Tooltip label={greetingTranslation} position="below">
            <p className="cursor-default text-[18px] font-medium text-muted-foreground">
              <span className="mr-2">{greetingEmoji}</span>
              {greeting}
            </p>
          </Tooltip>
        ) : (
          <p className="text-[18px] font-medium text-muted-foreground">
            <span className="mr-2">{greetingEmoji}</span>
            {greeting}
          </p>
        )
      ) : backLink ? (
        <Link
          href={backLink.href}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLink.label}
        </Link>
      ) : (
        <div />
      )}

      {/* Right: width toggle — desktop only */}
      <div className="hidden md:block">
        <Tooltip label={width === "md" ? t("tip_expand_width") : t("tip_shrink_width")} position="below">
          <button
            onClick={onToggleWidth}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-beige hover:text-foreground ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
            aria-label={width === "md" ? "Expand page width" : "Shrink page width"}
          >
            {width === "md" ? (
              <ChevronsLeftRight className="h-4 w-4" />
            ) : (
              <ChevronsRightLeft className="h-4 w-4" />
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
