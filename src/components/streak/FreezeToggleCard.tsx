"use client";

import { useState, useTransition } from "react";
import { Snowflake } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setStreakFreezeAutoAction } from "@/lib/mutations/streak";

interface FreezeToggleCardProps {
  freezesAvailable: number;
  initialAuto: boolean;
}

/**
 * Streak-page card showing the user's freeze token count and a toggle for
 * whether freezes auto-apply on missed days. Mirrors the visual rhythm of
 * the sibling stat cards (rounded-2xl bg-white p-5, icon + uppercase label,
 * big number value).
 */
export function FreezeToggleCard({
  freezesAvailable,
  initialAuto,
}: FreezeToggleCardProps) {
  const [auto, setAuto] = useState(initialAuto);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (next: boolean) => {
    setAuto(next); // optimistic
    startTransition(async () => {
      const result = await setStreakFreezeAutoAction(next);
      if (!result.success) {
        // Roll back optimistic update on failure.
        setAuto(!next);
      }
    });
  };

  return (
    <div className="flex flex-col rounded-2xl bg-white p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Snowflake className="h-4 w-4 text-blue-500" strokeWidth={1.67} />
        <span className="text-xs-medium uppercase tracking-wide">
          Freezes available
        </span>
      </div>
      <p className="mt-2 text-xl-semibold text-foreground">
        {freezesAvailable}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <label
          htmlFor="freeze-auto-toggle"
          className="text-[13px] leading-[1.4] text-muted-foreground"
        >
          Auto-apply on missed day
        </label>
        <Switch
          id="freeze-auto-toggle"
          checked={auto}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </div>
    </div>
  );
}
