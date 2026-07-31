"use client";

import type { ReactNode } from "react";

interface CompletedModalActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** Highlighted primary action (blue background). */
  primary?: boolean;
  /** Muted action (dimmed text). */
  muted?: boolean;
  /** Icon animation on hover. Defaults to "rotate". */
  iconHover?: "rotate" | "shift" | "none";
  /** Shorter label shown only on mobile (below `sm`). Falls back to `label`. */
  mobileLabel?: string;
  /** Extra classes for placement within the footer grid (e.g. flex sizing). */
  className?: string;
}

/**
 * Action button used in the footer of completion modals. On mobile it's a
 * compact horizontal row (icon + label side by side); at `sm` and up it
 * becomes the taller icon-over-label tile. Three visual variants: primary,
 * muted, default.
 */
export function CompletedModalActionButton({
  icon,
  label,
  onClick,
  primary,
  muted,
  iconHover = "rotate",
  mobileLabel,
  className,
}: CompletedModalActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-colors sm:max-w-[160px] sm:flex-col sm:justify-normal sm:py-4 ${
        primary
          ? "border-primary bg-primary text-white hover:border-blue-dark"
          : muted
            ? "border-transparent bg-white text-muted-foreground hover:border-primary"
            : "border-transparent bg-white text-foreground hover:border-primary"
      } ${className ?? ""}`}
    >
      <span
        className={
          iconHover === "none"
            ? ""
            : iconHover === "shift"
              ? "transition-transform duration-200 group-hover:translate-x-1"
              : "transition-transform duration-200 group-hover:-rotate-90"
        }
      >
        {icon}
      </span>
      <span className="text-center text-xs font-medium leading-tight">
        {mobileLabel ? (
          <>
            <span className="sm:hidden">{mobileLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          label
        )}
      </span>
    </button>
  );
}
