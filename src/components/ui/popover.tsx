import { cn } from "@/lib/utils";

/**
 * White-background hover popover for content expansion
 * (e.g. time breakdowns, mastery stats, rate calculations).
 *
 * For simple functional explainers (button labels), use <Tooltip> instead.
 */
export function Popover({
  children,
  content,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  /** Which edge of the trigger the popover aligns to */
  align?: "left" | "right";
  /** Additional classes on the wrapper (e.g. flex, cursor-default) */
  className?: string;
}) {
  return (
    <div className={cn("group/pop relative", className)}>
      {children}
      <div
        className={cn(
          "pointer-events-none absolute top-full z-50 mt-1 whitespace-nowrap rounded-xl bg-white px-4 py-3 opacity-0 shadow-xl ring-1 ring-black/5 transition-opacity group-hover/pop:opacity-100",
          align === "left" ? "left-0" : "right-0"
        )}
      >
        {content}
      </div>
    </div>
  );
}
