import { Star, Check } from "lucide-react";
import { status as statusTokens } from "@/lib/design-tokens";

export type StatusType = "mastered" | "learned" | "learning" | "notStarted" | "locked";

interface StatusPillProps {
  status: StatusType;
  /** Custom label (defaults to status name) */
  label?: string;
  /** Show colored dot before label */
  showDot?: boolean;
  /** "pill" = colored background, "inline" = plain text with colored dot/star */
  variant?: "pill" | "inline";
  /** Override background color */
  bgOverride?: string;
}

const statusLabels: Record<StatusType, string> = {
  mastered: "Mastered",
  learned: "Learned",
  learning: "Learning",
  notStarted: "Not started",
  locked: "Locked",
};

export function StatusPill({
  status,
  label,
  showDot = true,
  variant = "pill",
  bgOverride,
}: StatusPillProps) {
  const style = statusTokens[status];
  const displayLabel = label || statusLabels[status];
  const isInline = variant === "inline";

  const dotColor = "dotColor" in style ? style.dotColor : undefined;
  const hasDot = showDot && Boolean(dotColor);
  const iconType = "icon" in style ? style.icon : undefined;
  const hasIcon = showDot && (iconType === "star" || iconType === "check");
  const inlineColor = ((style as Record<string, string>).inlineColor ?? style.bg) as string;

  return (
    <span
      className={
        isInline
          ? "inline-flex cursor-default items-center gap-1.5 text-regular-semibold"
          : "inline-flex cursor-default items-center gap-1.5 rounded-full px-3 py-1.5 text-xs-medium"
      }
      style={isInline ? {} : {
        background: bgOverride ?? style.bg,
        color: style.color,
      }}
    >
      {hasIcon && iconType === "star" && (
        <Star
          className={isInline ? "h-3.5 w-3.5 fill-current" : "h-3 w-3 fill-current"}
          style={isInline ? { color: inlineColor } : undefined}
        />
      )}
      {hasIcon && iconType === "check" && (
        <Check
          className={isInline ? "h-3.5 w-3.5" : "h-3 w-3"}
          strokeWidth={4}
          style={isInline ? { color: inlineColor } : undefined}
        />
      )}
      {hasDot && (
        <span className={isInline ? "inline-flex h-3.5 w-3.5 items-center justify-center" : "inline-flex h-3 w-3 items-center justify-center"}>
          <span
            className="inline-flex h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        </span>
      )}
      {displayLabel}
    </span>
  );
}
