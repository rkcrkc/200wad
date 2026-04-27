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
}: {
  children: React.ReactNode;
  label: string;
  /** Show above or below the trigger (default: above) */
  position?: "above" | "below";
  /** Horizontal alignment (default: center) */
  align?: "center" | "left" | "right";
}) {
  const positionClass = position === "above" ? "bottom-full mb-2" : "top-full mt-1";
  const alignClass =
    align === "right"
      ? "right-0"
      : align === "left"
        ? "left-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div className="group/tip relative">
      {children}
      <div
        className={`tooltip-hover pointer-events-none absolute z-50 w-max max-w-[calc(100vw-24px)] rounded-lg bg-foreground px-3 py-1.5 text-xs font-normal text-white opacity-0 transition-opacity group-hover/tip:opacity-100 ${positionClass} ${alignClass}`}
      >
        {label}
      </div>
    </div>
  );
}
