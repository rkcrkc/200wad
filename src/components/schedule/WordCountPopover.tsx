"use client";

import { Popover } from "@/components/ui/popover";

interface WordCountPopoverProps {
  wordCount: number;
  sampleWords: string[];
}

export function WordCountPopover({ wordCount, sampleWords }: WordCountPopoverProps) {
  return (
    <Popover
      align="right"
      className="cursor-default"
      content={
        <div className="flex max-w-[240px] flex-wrap gap-1.5 whitespace-normal">
          {sampleWords.map((word, i) => (
            <span key={i} className="rounded-md bg-bone px-2 py-1 text-xs text-foreground">
              {word}
            </span>
          ))}
        </div>
      }
    >
      <span className="text-regular-semibold text-muted-foreground hover:text-foreground">
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </span>
    </Popover>
  );
}
