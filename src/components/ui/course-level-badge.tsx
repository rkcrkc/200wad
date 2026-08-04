import { cn } from "@/lib/utils";

const levelStyles = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
};

const levelLabels = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Difficulty pill for a course (Beginner/Intermediate/Advanced), optionally
 * appending the CEFR range. Shared by the courses grid and the My Languages
 * accordion so the level → colour mapping stays in one place.
 */
export function CourseLevelBadge({
  level,
  cefrRange,
  size = "default",
  className,
}: {
  level: string | null;
  cefrRange?: string | null;
  /** `sm` is a compact pill (tighter padding) for dense rows like the mobile
   *  course header. */
  size?: "default" | "sm";
  className?: string;
}) {
  const key = (level || "beginner") as keyof typeof levelStyles;

  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full text-xs font-medium",
        size === "sm" ? "px-2 py-0.5" : "px-3 py-1.5",
        levelStyles[key],
        className
      )}
    >
      {levelLabels[key]}
      {cefrRange && ` • ${cefrRange}`}
    </span>
  );
}
