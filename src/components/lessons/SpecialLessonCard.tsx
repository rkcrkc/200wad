"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpecialLessonCardProps {
  emoji: string;
  title: string;
  /** Number of words in this auto-lesson. */
  count: number;
  /** Label shown on hover in place of the word count, e.g. "View" / "Start test". */
  hoverLabel: string;
  /** When provided, renders as a link to this href. */
  href?: string;
  /** When provided, renders as a button calling this on click. */
  onClick?: () => void;
}

const baseClass =
  "group flex w-fit flex-shrink-0 snap-start items-center gap-3 rounded-xl bg-white p-3 text-left shadow-card transition-shadow hover:shadow-[0px_4px_12px_-2px_rgba(0,0,0,0.10)]";

export function SpecialLessonCard({
  emoji,
  title,
  count,
  hoverLabel,
  href,
  onClick,
}: SpecialLessonCardProps) {
  const isEmpty = count === 0;
  const className = cn(baseClass, isEmpty && "opacity-80");
  const wordLabel = `${count} ${count === 1 ? "word" : "words"}`;

  const content = (
    <>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-xl">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-regular-semibold text-foreground">
          {title}
        </div>
        {/* Mobile: word count sits beneath the title so it doesn't squeeze the
            name. Touch has no hover, so no hover-label swap here. */}
        <div className="mt-0.5 text-xs-medium text-muted-foreground md:hidden">
          {wordLabel}
        </div>
      </div>
      {/* Desktop: word count on the right, swapping to the hover label. */}
      <div className="hidden flex-shrink-0 grid-cols-1 items-center justify-items-end md:grid">
        <span className="col-start-1 row-start-1 text-xs-medium text-muted-foreground transition-opacity duration-150 group-hover:opacity-0">
          {wordLabel}
        </span>
        <span className="col-start-1 row-start-1 flex items-center gap-0.5 whitespace-nowrap text-xs-medium text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {hoverLabel}
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
