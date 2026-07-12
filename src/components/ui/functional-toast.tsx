"use client";

import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

/**
 * Styled card for functional toasts (save confirms, errors, etc.).
 *
 * `<Toaster>` is configured `unstyled`, so the sonner wrapper is transparent
 * and borderless — every toast must supply its own visible surface. This is
 * the functional counterpart to `<AchievementToast>`: a white card with a
 * variant-coloured status icon, rendered via the `toast` helper in
 * `@/lib/toast`. Feature code shouldn't import this directly.
 */
export type FunctionalToastVariant = "success" | "error" | "info" | "warning";

const VARIANT_CONFIG: Record<
  FunctionalToastVariant,
  { Icon: typeof CheckCircle2; color: string }
> = {
  success: { Icon: CheckCircle2, color: "text-success" },
  error: { Icon: XCircle, color: "text-destructive" },
  info: { Icon: Info, color: "text-primary" },
  warning: { Icon: TriangleAlert, color: "text-warning" },
};

interface FunctionalToastProps {
  variant: FunctionalToastVariant;
  message: string;
  onDismiss: () => void;
}

export function FunctionalToast({
  variant,
  message,
  onDismiss,
}: FunctionalToastProps) {
  const { Icon, color } = VARIANT_CONFIG[variant];
  return (
    <div className="flex w-full min-w-[320px] max-w-[420px] items-start gap-3 rounded-2xl border border-[#e7e2d6] bg-white px-5 py-4 shadow-card">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
      <p className="flex-1 text-small-medium text-foreground">{message}</p>
      <button
        onClick={onDismiss}
        className="mt-0.5 shrink-0 rounded-lg p-1 text-foreground/40 transition-colors hover:bg-black/5 hover:text-foreground/70"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
