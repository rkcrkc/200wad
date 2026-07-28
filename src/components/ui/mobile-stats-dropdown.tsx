"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileStat {
  label: string;
  /**
   * The stat's right-hand content — value text, badges, rings. Reused verbatim
   * for the inline block and the dropdown rows, so it should be layout-agnostic.
   */
  value: ReactNode;
}

interface MobileStatsDropdownProps {
  /** First entry renders inline; the rest live behind the caret. */
  stats: MobileStat[];
  className?: string;
}

/**
 * Phone treatment for a multi-stat page header: a row of 3–4 stats wraps
 * raggedly and eats the first screen, so mobile shows only the first stat
 * inline with a caret and reveals the rest in a dropdown on tap.
 *
 * Mobile-only (`md:hidden`) by design — desktop stat rows carry richer
 * per-stat popovers/tooltips that don't translate to touch, so callers keep
 * their own row behind `hidden md:flex` rather than sharing one renderer.
 */
export function MobileStatsDropdown({ stats, className }: MobileStatsDropdownProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (stats.length === 0) return null;

  const [first, ...rest] = stats;

  return (
    <div className={cn("relative md:hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={rest.length === 0}
        aria-expanded={open}
        className="flex items-center gap-2"
      >
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-xs text-muted-foreground">{first.label}</span>
          <div className="flex items-center gap-2">{first.value}</div>
        </div>
        {rest.length > 0 && (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {open && rest.length > 0 && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 top-full z-20 mt-2 flex min-w-[240px] flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-card">
            {rest.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-6">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <div className="flex items-center gap-2">{s.value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
