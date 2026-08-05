"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DemoWord } from "./demoWords";
import type { DemoPhase } from "./useAutoDemo";

/**
 * Non-interactive replica of the app's real test answer bar
 * (src/components/study/TestAnswerInput.tsx), shared by both landing-page
 * demos so visitors see the genuine product UI. Container, answer, feedback
 * and button classes mirror that component exactly — including the actual
 * full-marks feedback copy ("✅ Correct! {points} 🙌", src/lib/text.ts).
 * All controls are decorative: the demo types and advances by itself.
 */
export function DemoAnswerBar({
  phase,
  word,
  typedCount,
}: {
  phase: DemoPhase;
  word: DemoWord;
  typedCount: number;
}) {
  const answered = phase === "payoff";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border-2 bg-white pl-3 pr-1.5 py-1.5 transition-colors sm:gap-4 md:pl-4 md:pr-2 md:py-2",
        answered ? "border-green-200" : "border-primary"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        {answered ? (
          <div className="min-w-0 flex-1 truncate text-base font-medium sm:overflow-visible sm:whitespace-normal md:text-xl">
            <span className="text-foreground">{word.headword}</span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center text-base font-medium md:text-xl">
            {typedCount > 0 && (
              <span className="truncate text-foreground">
                {word.headword.slice(0, typedCount)}
              </span>
            )}
            <span
              aria-hidden
              className="ml-px inline-block h-5 w-0.5 shrink-0 animate-pulse bg-foreground/70"
            />
            {typedCount === 0 && (
              <span className="ml-1 truncate text-black/50">Type the Italian...</span>
            )}
          </div>
        )}

        {answered && (
          <span className="whitespace-nowrap text-[11px] font-medium text-green-600 sm:text-[15px]">
            ✅ Correct! +3 XP 🙌
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Button tabIndex={-1} aria-hidden className="pointer-events-none gap-1.5">
          {answered ? (
            <>
              <span className="sm:hidden">Next</span>
              <span className="hidden sm:inline">Next word</span>
            </>
          ) : (
            "Submit"
          )}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
