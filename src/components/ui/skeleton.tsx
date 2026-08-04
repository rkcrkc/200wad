import { cn } from "@/lib/utils";

/**
 * Skeleton primitive for loading states.
 *
 * Use as a low-detail placeholder that roughly matches the shape and
 * spacing of the real content that will load in. Renders as a server
 * component for instant SSR with no hydration cost.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        // `max-w-full` keeps fixed-width placeholders (e.g. `w-96`) from
        // bleeding past a narrow parent on mobile; on wider screens the parent
        // exceeds the fixed width so it's a no-op. Callers can override with
        // `max-w-none` if they ever need a skeleton wider than its container.
        "max-w-full animate-pulse rounded-md bg-black/10",
        className
      )}
      {...props}
    />
  );
}
