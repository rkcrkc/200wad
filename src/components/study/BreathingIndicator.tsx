"use client";

import { cn } from "@/lib/utils";

export type BreathingPhase = "inhale" | "hold" | "exhale";

interface BreathingIndicatorProps {
  /** Current breathing phase */
  phase: BreathingPhase;
  /** Current second within the phase (0-3) */
  second: number;
  /** Whether the indicator is active (visible during reveal phases) */
  isActive: boolean;
}

const PHASE_LABELS: Record<BreathingPhase, string> = {
  inhale: "Breathe in",
  hold: "Hold",
  exhale: "Breathe out",
};

export function BreathingIndicator({
  phase,
  second,
  isActive,
}: BreathingIndicatorProps) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-foreground">
        {PHASE_LABELS[phase]}
      </span>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors duration-200",
              i <= second ? "bg-primary" : "bg-gray-300"
            )}
          />
        ))}
      </div>
    </div>
  );
}
