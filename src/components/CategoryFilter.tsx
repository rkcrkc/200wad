"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  value: string;
  label: string;
}

interface CategoryFilterProps {
  options: CategoryOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function CategoryFilter({ options, selected, onChange }: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSelection = selected.length > 0;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          hasSelection
            ? "bg-primary text-white"
            : "text-foreground hover:bg-beige"
        )}
        aria-label="Filter by category"
        aria-expanded={isOpen}
      >
        <Filter className="h-5 w-5" />
        {hasSelection && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-white">
            {selected.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs-medium text-muted-foreground uppercase tracking-wide">
              Category
            </span>
            {hasSelection && (
              <button
                onClick={clearAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="py-1">
            {options.map((option) => {
              const isChecked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-bone-hover"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isChecked
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300 bg-white"
                    )}
                  >
                    {isChecked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
