import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/helpers";
import { XpIcon } from "@/components/ui/xp-icon";

type XpBadgeVariant =
  | "available"
  | "available-blue"
  | "earned"
  | "default"
  | "on-primary"
  | "on-primary-subtle";
type XpBadgeSize = "xs" | "sm" | "md";

/**
 * XP chip used wherever an XP value is shown.
 * - `available` (borderless, light purple fill, purple icon + text): max possible XP, e.g. `word_count × 3`.
 * - `available-blue` (borderless, light blue fill, blue icon + text): the blue counterpart to `available`,
 *   e.g. the max-XP chip inside the lesson "Take test" button.
 * - `earned` (borderless, solid purple fill, white icon + text): XP actually earned from tests.
 * - `default` (no fill, purple icon + black value): a plain stat readout, e.g. Best day / Best week.
 *   Drops the horizontal padding the filled variants use, so the icon sits flush-left and lines up
 *   with a label above it (matches the trophies/lessons header-stat format).
 * - `on-primary` (translucent white fill, white icon + text): for sitting inside a filled
 *   primary-colored button, where the purple `available` chip wouldn't read.
 * - `on-primary-subtle` (no fill, dimmed white icon + text): the quieter counterpart to
 *   `on-primary`, for compact in-button use (table rows) where a filled chip crowds the
 *   control. Separation from the button's own label comes from the drop in brightness
 *   rather than a background, so it also drops the horizontal padding.
 *
 * `[&]:text-*` (rather than plain `text-*`) keeps the color through twMerge
 * alongside the custom `text-*` typography utility, and stops it inheriting
 * from a colored parent (e.g. a Button).
 */
const VARIANT_STYLES: Record<XpBadgeVariant, { container: string; icon: string }> = {
  available: { container: "bg-purple-50 [&]:text-purple-500", icon: "" },
  "available-blue": { container: "bg-blue-50 [&]:text-blue-600", icon: "fill-blue-600 text-blue-600" },
  earned: { container: "bg-purple-500 [&]:text-white", icon: "fill-white text-white" },
  default: { container: "px-0 [&]:text-black", icon: "" },
  "on-primary": { container: "bg-white/20 [&]:text-white", icon: "fill-white text-white" },
  "on-primary-subtle": { container: "px-0 [&]:text-white/70", icon: "fill-white/70 text-white/70" },
};

// Icons use `size-*` (not `h-*/w-*`) so they keep their size inside shadcn
// Buttons, whose `[&_svg:not([class*='size-'])]:size-4` rule would otherwise
// force them to 16px.
const SIZE_STYLES: Record<XpBadgeSize, { badge: string; icon: string; pad: string }> = {
  xs: { badge: "text-[11px] font-medium", icon: "size-2.5", pad: "px-1.5 py-0.5" },
  sm: { badge: "text-xs-medium", icon: "size-3", pad: "px-2 py-0.5" },
  md: { badge: "text-regular-semibold", icon: "size-3.5", pad: "px-2 py-0.5" },
};

export function XpBadge({
  value,
  variant = "available",
  size = "sm",
  showPlus = false,
  className,
}: {
  value: number;
  variant?: XpBadgeVariant;
  size?: XpBadgeSize;
  showPlus?: boolean;
  className?: string;
}) {
  const sizeStyles = SIZE_STYLES[size];
  const variantStyles = VARIANT_STYLES[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md",
        sizeStyles.pad,
        variantStyles.container,
        sizeStyles.badge,
        className
      )}
    >
      <XpIcon className={cn(sizeStyles.icon, variantStyles.icon)} />
      {showPlus ? `+${formatNumber(value)}` : formatNumber(value)}
    </span>
  );
}
