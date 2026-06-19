import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/helpers";
import { XpIcon } from "@/components/ui/xp-icon";

type XpBadgeVariant = "available" | "earned" | "default";
type XpBadgeSize = "sm" | "md";

/**
 * XP chip used wherever an XP value is shown.
 * - `available` (borderless, light purple fill, purple icon + text): max possible XP, e.g. `word_count × 3`.
 * - `earned` (borderless, solid purple fill, white icon + text): XP actually earned from tests.
 * - `default` (no fill, purple icon + black value): a plain stat readout, e.g. Best day / Best week.
 *   Drops the horizontal padding the filled variants use, so the icon sits flush-left and lines up
 *   with a label above it (matches the trophies/lessons header-stat format).
 *
 * `[&]:text-*` (rather than plain `text-*`) keeps the color through twMerge
 * alongside the custom `text-*` typography utility, and stops it inheriting
 * from a colored parent (e.g. a Button).
 */
const VARIANT_STYLES: Record<XpBadgeVariant, { container: string; icon: string }> = {
  available: { container: "bg-purple-50 [&]:text-purple-500", icon: "" },
  earned: { container: "bg-purple-500 [&]:text-white", icon: "fill-white text-white" },
  default: { container: "px-0 [&]:text-black", icon: "" },
};

// Icons use `size-*` (not `h-*/w-*`) so they keep their size inside shadcn
// Buttons, whose `[&_svg:not([class*='size-'])]:size-4` rule would otherwise
// force them to 16px.
const SIZE_STYLES: Record<XpBadgeSize, { badge: string; icon: string }> = {
  sm: { badge: "text-xs-medium", icon: "size-3" },
  md: { badge: "text-regular-semibold", icon: "size-3.5" },
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
        "inline-flex items-center justify-center gap-1 rounded-md px-2 py-0.5",
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
