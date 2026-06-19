import { cn } from "@/lib/utils";

/**
 * Rank/belt badge. Colours come from the admin-editable `levels.color` hex, so
 * we drive everything with inline styles rather than Tailwind classes (which
 * can't be built from an arbitrary runtime value): tinted fill, colour-matched
 * border and text. Used everywhere a rank is surfaced (leaderboard rows, the
 * profile Experience Level card) so the belt reads consistently.
 */
export function LevelBadge({
  name,
  color,
  size = "sm",
  className,
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      style={{
        color,
        backgroundColor: hexToRgba(color, 0.12),
        borderColor: hexToRgba(color, 0.4),
      }}
      className={cn(
        "inline-flex items-center rounded-full border font-semibold leading-none",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-4 py-1.5 text-regular-semibold",
        className
      )}
    >
      {name}
    </span>
  );
}

/** Expand a 3- or 6-digit hex to an rgba() string; grey fallback on bad input. */
function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(156, 163, 175, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
