"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { XpIcon } from "@/components/ui/xp-icon";

interface DailyGoalEditorProps {
  /**
   * Seed value (`users.daily_xp_goal`). The editor manages its own chip/input
   * UI state from here; the parent owns the committed value via `onChange` and
   * decides when to persist it (e.g. a page-level "Save changes" button).
   */
  initialGoal: number;
  /**
   * Reports the currently-chosen goal, or `null` when the custom input is
   * empty / out of range so the parent can disable saving.
   */
  onChange: (value: number | null) => void;
}

const PRESETS = [10, 30, 50, 100] as const;
const GOAL_MIN = 1;
const GOAL_MAX = 500;

/**
 * Controlled picker for `users.daily_xp_goal`. Renders a horizontal chip row
 * of presets plus a "Custom" chip that reveals a numeric input. It is purely a
 * value editor — persistence is the parent's responsibility.
 */
export function DailyGoalEditor({ initialGoal, onChange }: DailyGoalEditorProps) {
  const isPresetInitial = (PRESETS as readonly number[]).includes(initialGoal);
  const [selected, setSelected] = useState<number>(initialGoal);
  const [customMode, setCustomMode] = useState<boolean>(!isPresetInitial);
  const [customValue, setCustomValue] = useState<string>(
    isPresetInitial ? "" : String(initialGoal)
  );

  const pendingValue = customMode ? parseCustom(customValue) : selected;
  const pendingValid =
    pendingValue !== null &&
    pendingValue >= GOAL_MIN &&
    pendingValue <= GOAL_MAX;

  // Report the chosen value (or null when invalid) up to the parent form.
  useEffect(() => {
    onChange(pendingValid ? pendingValue : null);
  }, [pendingValue, pendingValid, onChange]);

  const showRangeError =
    customMode && customValue.trim() !== "" && !pendingValid;

  const handlePresetClick = (value: number) => {
    setCustomMode(false);
    setSelected(value);
  };

  const handleCustomClick = () => {
    setCustomMode(true);
    if (!customValue) {
      setCustomValue(String(selected));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const isActive = !customMode && selected === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                "rounded-full border-[1.5px] px-3 py-1 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground"
              )}
            >
              <span className="inline-flex items-center gap-1">
                <XpIcon className="h-3.5 w-3.5" />
                {preset}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleCustomClick}
          className={cn(
            "rounded-full border-[1.5px] px-3 py-1 text-sm font-medium transition-colors",
            customMode
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-white text-foreground"
          )}
        >
          Custom…
        </button>
      </div>

      {customMode && (
        <div className="flex items-center gap-2">
          <XpIcon className="h-4 w-4" />
          <input
            type="number"
            min={GOAL_MIN}
            max={GOAL_MAX}
            step={1}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="w-24 rounded-md border-[1.5px] border-border bg-white px-2 py-1 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      )}

      {showRangeError && (
        <p className="text-small-regular text-destructive">
          Enter a whole number between {GOAL_MIN} and {GOAL_MAX}.
        </p>
      )}
    </div>
  );
}

function parseCustom(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
  return value;
}
