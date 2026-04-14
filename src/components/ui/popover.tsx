"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, useCallback } from "react";

/**
 * White-background hover popover for content expansion
 * (e.g. time breakdowns, mastery stats, rate calculations).
 *
 * Auto-flips alignment when the popover would overflow the viewport edge.
 * For simple functional explainers (button labels), use <Tooltip> instead.
 */
export function Popover({
  children,
  content,
  align = "left",
  position = "below",
  className,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  /** Which edge of the trigger the popover aligns to */
  align?: "left" | "right";
  /** Show above or below the trigger (default: below) */
  position?: "above" | "below";
  /** Additional classes on the wrapper (e.g. flex, cursor-default) */
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [resolvedAlign, setResolvedAlign] = useState(align);

  const handleMouseEnter = useCallback(() => {
    const container = containerRef.current;
    const panel = panelRef.current;
    if (!container || !panel) return;

    const triggerRect = container.getBoundingClientRect();
    const panelWidth = panel.scrollWidth;

    if (align === "left") {
      // Would overflow right edge?
      if (triggerRect.left + panelWidth > window.innerWidth - 16) {
        setResolvedAlign("right");
      } else {
        setResolvedAlign("left");
      }
    } else {
      // Would overflow left edge?
      if (triggerRect.right - panelWidth < 16) {
        setResolvedAlign("left");
      } else {
        setResolvedAlign("right");
      }
    }
  }, [align]);

  return (
    <div
      ref={containerRef}
      className={cn("group/pop relative", className)}
      onMouseEnter={handleMouseEnter}
    >
      {children}
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-[min(400px,calc(100vw-32px))] rounded-xl bg-white px-4 py-3 opacity-0 shadow-xl ring-1 ring-black/5 transition-opacity group-hover/pop:opacity-100",
          position === "above" ? "bottom-full mb-1" : "top-full mt-1",
          resolvedAlign === "left" ? "left-0" : "right-0"
        )}
      >
        {content}
      </div>
    </div>
  );
}
