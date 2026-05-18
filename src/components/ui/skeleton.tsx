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
        "animate-pulse rounded-md bg-black/10",
        className
      )}
      {...props}
    />
  );
}
