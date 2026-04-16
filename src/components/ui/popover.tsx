"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, useCallback, useEffect } from "react";

/**
 * White-background hover popover for content expansion
 * (e.g. time breakdowns, mastery stats, rate calculations).
 *
 * Auto-flips alignment and position when the popover would overflow the viewport edge.
 * Uses fixed positioning to avoid clipping by overflow containers.
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
  const [resolvedPosition, setResolvedPosition] = useState(position);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState(false);

  const updatePosition = useCallback(() => {
    const container = containerRef.current;
    const panel = panelRef.current;
    if (!container || !panel) return;

    const triggerRect = container.getBoundingClientRect();
    const panelWidth = panel.scrollWidth;
    const panelHeight = panel.scrollHeight;

    let finalAlign = align;
    let finalPosition = position;

    // Handle horizontal overflow
    if (align === "left") {
      if (triggerRect.left + panelWidth > window.innerWidth - 16) {
        finalAlign = "right";
      }
    } else {
      if (triggerRect.right - panelWidth < 16) {
        finalAlign = "left";
      }
    }

    // Handle vertical overflow
    if (position === "above") {
      if (triggerRect.top - panelHeight < 16) {
        finalPosition = "below";
      }
    } else {
      if (triggerRect.bottom + panelHeight > window.innerHeight - 16) {
        finalPosition = "above";
      }
    }

    setResolvedAlign(finalAlign);
    setResolvedPosition(finalPosition);

    // Calculate fixed position
    const style: React.CSSProperties = {};

    // Horizontal position
    if (finalAlign === "left") {
      style.left = triggerRect.left;
    } else {
      style.right = window.innerWidth - triggerRect.right;
    }

    // Vertical position
    if (finalPosition === "above") {
      style.bottom = window.innerHeight - triggerRect.top + 4;
    } else {
      style.top = triggerRect.bottom + 4;
    }

    console.log('[Popover] Panel style:', style);
    setPanelStyle(style);
  }, [align, position]);

  const handleMouseEnter = useCallback(() => {
    console.log('[Popover] Mouse enter');
    setIsHovered(true);
    updatePosition();
  }, [updatePosition]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Update position on scroll
  useEffect(() => {
    if (!isHovered) return;

    const handleScroll = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isHovered, updatePosition]);

  return (
    <div
      ref={containerRef}
      className={cn("group/pop relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div
        ref={panelRef}
        style={panelStyle}
        className={cn(
          "pointer-events-none fixed z-50 w-max max-w-[min(400px,calc(100vw-32px))] rounded-xl bg-white px-4 py-3 shadow-xl ring-1 ring-black/5 transition-opacity duration-150",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        {content}
      </div>
    </div>
  );
}
