"use client";

import type { ReactNode } from "react";
import { ChevronRight, Check } from "lucide-react";

interface AllLanguagesUpsellCardProps {
  /** Supporting copy under the heading (may include an inline price). */
  description: ReactNode;
  /** Action button label. */
  buttonLabel: string;
  onButtonClick: () => void;
  /**
   * When true the offer is already selected (e.g. sitting in the cart): the
   * button switches to an outlined "status" style with a check instead of the
   * forward chevron.
   */
  selected?: boolean;
}

/**
 * Shared "Unlock all languages" upsell banner used on both the subscriptions
 * page (cart-driven) and the courses/dashboard page (modal-driven). The visual
 * is fixed; callers supply the copy, button label, and click behaviour.
 */
export function AllLanguagesUpsellCard({
  description,
  buttonLabel,
  onButtonClick,
  selected = false,
}: AllLanguagesUpsellCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-5 text-white shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">
          🌍
        </div>
        <div className="min-w-0">
          <h3 className="text-xl-semibold">Unlock all languages</h3>
          <p className="text-base text-white/80">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onButtonClick}
        className={`group inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${
          selected
            ? "border border-white/70 text-white"
            : "bg-white text-primary"
        }`}
      >
        {buttonLabel}
        {selected ? (
          <Check className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </button>
    </div>
  );
}
