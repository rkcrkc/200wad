"use client";

import type { ReactNode } from "react";

interface CompletedModalActionCardProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** Highlighted primary action (blue background). */
  primary?: boolean;
  /** Muted action (dimmed text). */
  muted?: boolean;
  /** Icon animation on hover. Defaults to "rotate". */
  iconHover?: "rotate" | "shift";
}

/**
 * Tile-shaped action button used in the footer of completion modals.
 * Icon on top, label underneath. Three visual variants: primary, muted, default.
 */
export function CompletedModalActionCard({
  icon,
  label,
  onClick,
  primary,
  muted,
  iconHover = "rotate",
}: CompletedModalActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full max-w-[160px] flex-col items-center gap-2 rounded-xl border px-3 py-4 transition-colors ${
        primary
          ? "border-primary bg-primary text-white hover:border-blue-dark"
          : muted
            ? "border-transparent bg-white text-muted-foreground hover:border-primary"
            : "border-transparent bg-white text-foreground hover:border-primary"
      }`}
    >
      <span
        className={
          iconHover === "shift"
            ? "transition-transform duration-200 group-hover:translate-x-1"
            : "transition-transform duration-200 group-hover:-rotate-90"
        }
      >
        {icon}
      </span>
      <span className="text-center text-xs font-medium leading-tight">{label}</span>
    </button>
  );
}
