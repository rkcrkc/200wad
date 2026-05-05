"use client";

import { X } from "lucide-react";

/**
 * Friendly, warm-styled toast card for achievements / positive milestones.
 *
 * Visually matches `<TipCard>` — cream background, gold border, rounded-2xl —
 * so achievement toasts read as part of the same family as in-page tips
 * rather than the black functional toasts (errors, save confirms) the rest
 * of the app uses.
 *
 * Render via `showAchievementToast(...)` from `@/lib/toast/achievement` —
 * this component shouldn't be imported by feature code directly.
 */
interface AchievementToastProps {
  title: string;
  message?: string;
  /** Defaults to 🎉. Pass null to render no emoji. */
  emoji?: string | null;
  onDismiss: () => void;
}

export function AchievementToast({
  title,
  message,
  emoji = "🎉",
  onDismiss,
}: AchievementToastProps) {
  return (
    <div className="w-full min-w-[320px] max-w-[420px] rounded-2xl border-[1.5px] border-[#F0C878] bg-[#FFF9E6] px-5 py-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-small-semibold text-foreground">
            {emoji ? `${emoji} ` : ""}
            {title}
          </p>
          {message && (
            <p className="mt-1 text-small-regular text-foreground/80">
              {message}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="mt-0.5 shrink-0 rounded-lg p-1 text-foreground/40 transition-colors hover:bg-black/5 hover:text-foreground/70"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
