import { status as statusTokens } from "@/lib/design-tokens";

export type StatusType = "mastered" | "studying" | "notStarted" | "locked";

interface StatusPillProps {
  status: StatusType;
  /** Custom label (defaults to status name) */
  label?: string;
  /** Show colored dot before label */
  showDot?: boolean;
}

const statusLabels: Record<StatusType, string> = {
  mastered: "Mastered",
  studying: "Studying",
  notStarted: "Not started",
  locked: "Locked",
};

export function StatusPill({
  status,
  label,
  showDot = true,
}: StatusPillProps) {
  const style = statusTokens[status];
  const displayLabel = label || statusLabels[status];

  const dotColor = "dotColor" in style ? style.dotColor : undefined;
  const hasDot = showDot && Boolean(dotColor);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs-medium"
      style={{
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {hasDot && (
        <span
          className="inline-flex h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {displayLabel}
    </span>
  );
}
