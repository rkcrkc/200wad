interface ProgressRingProps {
  /** Progress value from 0-100 */
  value: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Show percentage text in center */
  showValue?: boolean;
  /** Custom color (defaults to primary blue) */
  color?: string;
}

export function ProgressRing({
  value,
  size = 32,
  strokeWidth = 3,
  showValue = false,
  color = "#0B6CFF",
}: ProgressRingProps) {
  // Clamp value to [0, 100] to prevent SVG rendering issues
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(20, 21, 21, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {showValue && (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-medium"
          style={{ color }}
        >
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
