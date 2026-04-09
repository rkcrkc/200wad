"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function InlineSearch({ value, onChange, placeholder = "Filter..." }: InlineSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow width transition to start
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen && value === "") {
      setIsOpen(false);
    } else if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    if (value === "") {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  const hasValue = value.length > 0;

  return (
    <div className="flex items-center">
      {/* Input container - slides open to the left of the icon */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "w-[180px] mr-1" : "w-0"
        )}
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="h-9 w-[180px] rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm outline-none focus:border-primary"
          />
          {hasValue && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search icon button */}
      <button
        onClick={handleToggle}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          hasValue
            ? "bg-primary text-white"
            : "text-foreground hover:bg-beige"
        )}
        aria-label={isOpen ? "Close search" : "Search"}
      >
        <Search className="h-5 w-5" />
      </button>
    </div>
  );
}
