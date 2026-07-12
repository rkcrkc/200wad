"use client";

import { toast as sonnerToast, type ExternalToast } from "sonner";
import {
  FunctionalToast,
  type FunctionalToastVariant,
} from "@/components/ui/functional-toast";

/**
 * Drop-in replacement for sonner's `toast`.
 *
 * `<Toaster>` renders `unstyled` (transparent, borderless wrapper) so that a
 * toast's own card is the only visible surface. That means sonner's default
 * `toast.success` / `toast.error` cards would have no background — so we route
 * the functional helpers through `toast.custom` to render `<FunctionalToast>`
 * instead. Everything else on sonner's `toast` (dismiss, custom, promise,
 * loading, …) is re-exported unchanged.
 *
 * Import this everywhere instead of `sonner` for functional toasts. For
 * achievement / milestone toasts use `showAchievementToast` from
 * `@/lib/toast/achievement`.
 */
function show(
  variant: FunctionalToastVariant,
  message: string,
  options?: ExternalToast
) {
  return sonnerToast.custom(
    (id) => (
      <FunctionalToast
        variant={variant}
        message={message}
        onDismiss={() => sonnerToast.dismiss(id)}
      />
    ),
    options
  );
}

export const toast = Object.assign(
  (message: string, options?: ExternalToast) => show("info", message, options),
  sonnerToast,
  {
    success: (message: string, options?: ExternalToast) =>
      show("success", message, options),
    error: (message: string, options?: ExternalToast) =>
      show("error", message, options),
    info: (message: string, options?: ExternalToast) =>
      show("info", message, options),
    warning: (message: string, options?: ExternalToast) =>
      show("warning", message, options),
  }
);
