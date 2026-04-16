"use client";

import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InformationNextButtonProps {
  isLastWord: boolean;
  onNext: () => void;
}

export function InformationNextButton({
  isLastWord,
  onNext,
}: InformationNextButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus button on mount so Enter advances
  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  // Enter key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext]);

  return (
    <div className="px-6 pt-3 pb-0">
      <div className="flex items-center gap-4 py-3">
        <span className="flex-1 text-xl font-medium text-black/50">
          Information page — read and continue
        </span>
        <Button ref={buttonRef} onClick={onNext} className="gap-1">
          {isLastWord ? "Finish lesson" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
