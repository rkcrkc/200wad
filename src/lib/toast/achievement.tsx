"use client";

import { toast } from "sonner";
import { AchievementToast } from "@/components/ui/achievement-toast";

/**
 * Render a friendly, warm-styled achievement toast (cream bg / gold border,
 * matching `<TipCard>`) instead of the default black functional toast.
 *
 * Use for milestones / positive feedback (first word learned, first word
 * mastered, streaks, etc.). Functional toasts (errors, save confirms) should
 * keep using `toast.success` / `toast.error` from sonner directly.
 *
 * Implementation note: Sonner's global `toastOptions.style` in `<Toaster>`
 * forces a black background on every toast.* helper, so we route through
 * `toast.custom` to render our own card and bypass the global styling.
 */
export interface ShowAchievementToastInput {
  title: string;
  message?: string;
  /** Defaults to 🎉. Pass null to render no emoji. */
  emoji?: string | null;
  /** Auto-dismiss duration in ms. Sonner default is ~4000. */
  duration?: number;
}

export function showAchievementToast({
  title,
  message,
  emoji,
  duration,
}: ShowAchievementToastInput): void {
  toast.custom(
    (id) => (
      <AchievementToast
        title={title}
        message={message}
        emoji={emoji}
        onDismiss={() => toast.dismiss(id)}
      />
    ),
    duration !== undefined ? { duration } : undefined
  );
}
