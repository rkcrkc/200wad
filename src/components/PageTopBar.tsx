"use client";

import Link from "next/link";
import { ChevronLeft, ChevronsLeftRight, ChevronsRightLeft } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

interface PageTopBarProps {
  backLink?: { href: string; label: string };
  width: "md" | "lg";
  onToggleWidth: () => void;
  mounted: boolean;
}

export function PageTopBar({
  backLink,
  width,
  onToggleWidth,
  mounted,
}: PageTopBarProps) {
  return (
    <div className="mb-8 flex items-center justify-between">
      {/* Left: optional back link */}
      {backLink ? (
        <Link
          href={backLink.href}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLink.label}
        </Link>
      ) : (
        <div />
      )}

      {/* Right: width toggle */}
      <Tooltip label={width === "md" ? "Expand" : "Shrink"} position="below">
        <button
          onClick={onToggleWidth}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-beige hover:text-foreground ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
          aria-label={width === "md" ? "Expand page width" : "Shrink page width"}
        >
          {width === "md" ? (
            <ChevronsLeftRight className="h-4 w-4" />
          ) : (
            <ChevronsRightLeft className="h-4 w-4" />
          )}
        </button>
      </Tooltip>
    </div>
  );
}
