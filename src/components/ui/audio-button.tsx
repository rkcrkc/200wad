import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioButtonProps {
  onClick?: () => void;
  isPlaying: boolean;
  /** Color when playing. Defaults to blue (#0B6CFF) */
  playingColor?: string;
  /** Color when not playing. Defaults to black/50 */
  idleColor?: string;
  /** Size of the icon. Defaults to 20px */
  size?: number;
}

export function AudioButton({
  onClick,
  isPlaying,
  playingColor = "#0B6CFF",
  idleColor = "rgba(20, 21, 21, 0.5)",
  size = 20,
}: AudioButtonProps) {
  const icon = (
    <Volume2
      className={cn("transition-colors", isPlaying && "animate-pulse")}
      style={{
        color: isPlaying ? playingColor : idleColor,
        width: size,
        height: size,
      }}
    />
  );

  // If onClick is provided, wrap in button; otherwise just render the icon
  if (onClick) {
    return (
      <button onClick={onClick} className="shrink-0">
        {icon}
      </button>
    );
  }

  return <span className="shrink-0">{icon}</span>;
}
