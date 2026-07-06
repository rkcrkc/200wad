import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  /** Content max-width. Defaults to the standard content container. */
  width?: "sm" | "ms" | "md" | "lg";
  /** Tighter vertical rhythm for dense sections. */
  compact?: boolean;
  id?: string;
}

const widthClass = {
  sm: "max-w-content-sm",
  ms: "max-w-content-ms",
  md: "max-w-content-md",
  lg: "max-w-content-lg",
} as const;

/** Consistent marketing section: vertical rhythm + centered content width. */
export function Section({ children, className, width = "ms", compact, id }: SectionProps) {
  return (
    <section id={id} className={cn(compact ? "py-12 sm:py-16" : "py-16 sm:py-24", className)}>
      <div className={cn("mx-auto px-5 sm:px-8", widthClass[width])}>{children}</div>
    </section>
  );
}
