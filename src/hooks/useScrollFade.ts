import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Detects whether a horizontally-scrollable container has more content to the
 * left or right, so fade indicators can be shown on the scrollable edges.
 */
export function useScrollFade() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    const atStart = el.scrollLeft <= 1;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setCanScrollLeft(hasOverflow && !atStart);
    setCanScrollRight(hasOverflow && !atEnd);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial DOM overflow measurement after layout
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  return { scrollRef, canScrollLeft, canScrollRight };
}
