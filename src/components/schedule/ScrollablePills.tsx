"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { WordTagPill } from "./WordTagPill";

interface ScrollablePillsProps {
  words: string[];
  rows: number;
}

export function ScrollablePills({ words, rows }: ScrollablePillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollState]);

  const perRow = Math.ceil(words.length / rows);
  const rowChunks = Array.from({ length: rows }, (_, i) =>
    words.slice(i * perRow, (i + 1) * perRow)
  );

  return (
    <div className="relative">
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />
      )}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex flex-col gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rowChunks.map((row, i) => (
          <div key={i} className="flex gap-2">
            {row.map((word, j) => (
              <WordTagPill key={j} word={word} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
