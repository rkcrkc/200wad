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
}: CompletedModalActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-28 flex-col items-center gap-2 rounded-xl px-3 py-4 transition-colors ${
        primary
          ? "bg-primary text-white hover:bg-primary/90"
          : muted
            ? "bg-white text-muted-foreground hover:bg-gray-50"
            : "bg-white text-foreground hover:bg-gray-50"
      }`}
    >
      {icon}
      <span className="text-center text-xs font-medium leading-tight">{label}</span>
    </button>
  );
}
