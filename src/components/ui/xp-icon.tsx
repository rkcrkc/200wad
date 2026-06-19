import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * XP indicator — a purple-filled crown used wherever an XP value is shown.
 * Defaults to a small inline size; pass `className` to override.
 */
export function XpIcon({ className }: { className?: string }) {
  return (
    <Crown
      aria-label="XP"
      className={cn("h-3.5 w-3.5 fill-purple-500 text-purple-500", className)}
    />
  );
}
