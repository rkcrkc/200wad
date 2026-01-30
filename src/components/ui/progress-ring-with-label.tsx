import { ProgressRing } from "./progress-ring";

interface ProgressRingWithLabelProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Optional secondary label below the percentage */
  secondaryLabel?: string;
}

export function ProgressRingWithLabel({
  value,
  size = 128,
  strokeWidth = 8,
  secondaryLabel,
}: ProgressRingWithLabelProps) {
  // Adjust text sizes based on ring size
  const isSmall = size <= 50;
  const percentageClass = isSmall
    ? "text-[10px] font-bold text-primary"
    : "text-2xl font-bold text-foreground";
  const secondaryClass = "text-xs text-muted-foreground";

  return (
    <div className="relative">
      <ProgressRing value={value} size={size} strokeWidth={strokeWidth} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={percentageClass}>{value}%</span>
        {secondaryLabel && (
          <span className={secondaryClass}>{secondaryLabel}</span>
        )}
      </div>
    </div>
  );
}
