"use client";

import { useRef, useState, useEffect } from "react";
import { Tooltip } from "@/components/ui/tooltip";

export function WordTagPill({ word }: { word: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  }, [word]);

  return (
    <Tooltip label={word}>
      <span
        ref={textRef}
        className={`relative block max-w-[130px] cursor-default overflow-hidden whitespace-nowrap rounded-md bg-bone px-3 py-1.5 text-sm font-medium text-foreground/80${isTruncated ? " after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-r after:from-bone/0 after:to-bone" : ""}`}
      >
        {word}
      </span>
    </Tooltip>
  );
}
