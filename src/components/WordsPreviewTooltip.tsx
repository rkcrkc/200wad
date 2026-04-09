"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

interface WordsPreviewTooltipProps {
  lessonId: string;
  wordCount: number;
  isAutoLesson?: boolean;
  /** "inline" = number with dotted underline (default), "pill" = rounded pill showing "X words" */
  variant?: "inline" | "pill";
}

export function WordsPreviewTooltip({
  lessonId,
  wordCount,
  isAutoLesson,
  variant = "inline",
}: WordsPreviewTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [words, setWords] = useState<{ headword: string; english: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showFade, setShowFade] = useState(false);
  const cacheRef = useRef<{ headword: string; english: string }[] | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    setShowFade(el.scrollHeight > el.clientHeight && !atBottom);
  }, []);

  useEffect(() => {
    if (isOpen && words) {
      // Check after render so scrollRef is attached
      requestAnimationFrame(checkScroll);
    }
  }, [isOpen, words, checkScroll]);

  const fetchWords = useCallback(async () => {
    if (cacheRef.current) {
      setWords(cacheRef.current);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("lesson_words")
        .select("sort_order, words(headword, english)")
        .eq("lesson_id", lessonId)
        .order("sort_order", { ascending: true });

      const items = (data || [])
        .map((d) => {
          const w = d.words as unknown as { headword: string; english: string } | null;
          return w ? { headword: w.headword, english: w.english } : null;
        })
        .filter(Boolean) as { headword: string; english: string }[];
      cacheRef.current = items;
      setWords(items);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    }
    setIsOpen(true);
    fetchWords();
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  const handleTooltipEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const isPill = variant === "pill";
  const label = isPill
    ? `${wordCount} ${wordCount === 1 ? "word" : "words"}`
    : `${wordCount}`;

  if (isAutoLesson || wordCount === 0) {
    return <>{label}</>;
  }

  return (
    <>
      <span
        ref={triggerRef}
        className={
          isPill
            ? "cursor-default rounded-full px-2.5 py-1 text-sm font-medium text-muted-foreground hover:bg-bone"
            : "cursor-default border-b border-dotted border-muted-foreground/40"
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {label}
      </span>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-50"
            style={{
              top: position.top,
              left: position.left,
              transform: "translateX(-50%)",
            }}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-lg bg-white py-2 shadow-lg ring-1 ring-black/5"
              style={{ minWidth: "200px", maxWidth: "340px" }}
            >
              {loading && !words ? (
                <p className="px-3 py-1 text-sm text-muted-foreground">Loading...</p>
              ) : words && words.length > 0 ? (
                <div className="relative">
                  <div
                    ref={scrollRef}
                    className="max-h-[260px] overflow-y-scroll"
                    onScroll={checkScroll}
                  >
                    {words.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-baseline gap-2 px-3 py-1"
                      >
                        <span className="w-1/2 truncate text-sm font-medium text-foreground">
                          {w.headword}
                        </span>
                        <span className="w-1/2 truncate text-xs text-muted-foreground">
                          {w.english}
                        </span>
                      </div>
                    ))}
                  </div>
                  {showFade && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 rounded-b-lg bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>
              ) : (
                <p className="px-3 py-1 text-sm text-muted-foreground">No words</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
