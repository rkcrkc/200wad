"use client";

import { cn } from "@/lib/utils";

type ContainerSize = "sm" | "md" | "lg";

interface PageContainerProps {
  children: React.ReactNode;
  /** Container size - determines max-width */
  size?: ContainerSize;
  /** Additional className */
  className?: string;
  /** Whether to include default top padding (default: true) */
  withTopPadding?: boolean;
}

const sizeClasses: Record<ContainerSize, string> = {
  sm: "max-w-content-sm", // 840px - forms, settings, auth
  md: "max-w-content-md", // 1080px - standard content
  lg: "max-w-content-lg", // 1280px - wide data displays
};

/**
 * Consistent page container with centered content and semantic max-width.
 *
 * Size guide:
 * - sm (840px): Forms, settings, authentication, focused content
 * - md (1080px): Standard pages, lessons, dashboard content
 * - lg (1280px): Wide data displays, tables, charts
 */
export function PageContainer({
  children,
  size = "md",
  className,
  withTopPadding = true,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        sizeClasses[size],
        withTopPadding && "pt-[80px]",
        className
      )}
    >
      {children}
    </div>
  );
}
