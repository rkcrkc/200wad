"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Black-background hover tooltip for functional explainers
 * (e.g. "Expand page width", "Replay audio", "First word").
 *
 * For content-expansion tooltips that show data breakdowns,
 * use <Popover> instead.
 */
export function Tooltip({
  children,
  label,
  position = "above",
  align = "center",
  portal = false,
}: {
  children: React.ReactNode;
  /** Tooltip body. String for short labels; ReactNode for richer content. */
  label: React.ReactNode;
  /** Show above, below, or to the right of the trigger (default: above) */
  position?: "above" | "below" | "right";
  /** Horizontal alignment for above/below tooltips (default: center) */
  align?: "center" | "left" | "right";
  /**
   * Render the tooltip in a `document.body` portal so it escapes
   * overflow-clipping ancestors (e.g. an `overflow-x-auto` scroller). Use for
   * triggers that live inside a scroll container, such as heatmap cells.
   */
  portal?: boolean;
}) {
  if (portal) {
    return (
      <PortalTooltip label={label} position={position} align={align}>
        {children}
      </PortalTooltip>
    );
  }

  // Right-positioned tooltips sit beside the trigger and ignore `align`.
  const positionClass =
    position === "right"
      ? "left-full top-1/2 ml-2 -translate-y-1/2"
      : position === "above"
        ? "bottom-full mb-2"
        : "top-full mt-1";
  const alignClass =
    position === "right"
      ? ""
      : align === "right"
        ? "right-0"
        : align === "left"
          ? "left-0"
          : "left-1/2 -translate-x-1/2";

  return (
    <div className="group/tip relative">
      {children}
      <div
        className={`tooltip-hover pointer-events-none absolute z-50 w-max max-w-[280px] rounded-lg bg-foreground px-3 py-1.5 text-xs font-normal leading-snug text-white opacity-0 transition-opacity group-hover/tip:opacity-100 ${positionClass} ${alignClass}`}
      >
        {label}
      </div>
    </div>
  );
}

/** Shared label styling for both the CSS and portal tooltip variants. */
const LABEL_CLASS =
  "pointer-events-none w-max max-w-[280px] rounded-lg bg-foreground px-3 py-1.5 text-xs font-normal leading-snug text-white";

/**
 * Portal variant: the label is measured against the trigger's viewport rect on
 * hover and rendered into `document.body` with `position: fixed`, so clipping
 * ancestors can't cut it off.
 */
function PortalTooltip({
  children,
  label,
  position,
  align,
}: {
  children: ReactNode;
  label: ReactNode;
  position: "above" | "below" | "right";
  align: "center" | "left" | "right";
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );

  const tx =
    position === "right"
      ? "0"
      : align === "left"
        ? "0"
        : align === "right"
          ? "-100%"
          : "-50%";
  const ty = position === "right" ? "-50%" : position === "above" ? "-100%" : "0";

  const show = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const anchorX =
      align === "left" ? r.left : align === "right" ? r.right : r.left + r.width / 2;
    if (position === "right") {
      setCoords({ top: r.top + r.height / 2, left: r.right + 8 });
    } else if (position === "above") {
      setCoords({ top: r.top - 8, left: anchorX });
    } else {
      setCoords({ top: r.bottom + 8, left: anchorX });
    }
  };

  const hide = () => setCoords(null);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`${LABEL_CLASS} fixed z-[100]`}
            style={{
              top: coords.top,
              left: coords.left,
              transform: `translate(${tx}, ${ty})`,
            }}
          >
            {label}
          </div>,
          document.body
        )}
    </div>
  );
}
