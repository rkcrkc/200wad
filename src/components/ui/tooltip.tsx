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
}: {
  children: React.ReactNode;
  label: string;
  /** Show above or below the trigger (default: above) */
  position?: "above" | "below";
}) {
  return (
    <div className="group/tip relative">
      {children}
      <div
        className={`tooltip-hover pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 ${
          position === "above" ? "bottom-full mb-2" : "top-full mt-1"
        }`}
      >
        {label}
      </div>
    </div>
  );
}
