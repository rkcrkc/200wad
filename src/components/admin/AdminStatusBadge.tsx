"use client";

import { cn } from "@/lib/utils";

interface AdminStatusBadgeProps {
  isPublished: boolean;
  className?: string;
}

export function AdminStatusBadge({
  isPublished,
  className,
}: AdminStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        isPublished
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800",
        className
      )}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}
