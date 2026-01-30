import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioButtonProps {
  onClick: () => void;
  isPlaying: boolean;
  /** Color when playing. Defaults to green (#00C950) */
  playingColor?: string;
  /** Color when not playing. Defaults to blue (#0B6CFF) */
  idleColor?: string;
}

export function AudioButton({
  onClick,
  isPlaying,
  playingColor = "#00C950",
  idleColor = "#0B6CFF",
}: AudioButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn("relative transition-colors", isPlaying && "animate-pulse")}
    >
      <Volume2
        className="h-5 w-5"
        style={{ color: isPlaying ? playingColor : idleColor }}
      />
    </button>
  );
}
