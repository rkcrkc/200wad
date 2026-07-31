"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * A horizontally-scrollable row (scrollbar hidden) with gradient edge fades that
 * appear only when there is more content to scroll to in that direction. Props
 * are forwarded to the inner scroll container, so `className` sets its layout
 * (e.g. `flex gap-4`) and `role` etc. pass through.
 *
 * `fadeClassName` sets the gradient's start colour so it can match the surface
 * the row sits on (defaults to `from-white`; use e.g. `from-background` on the
 * cream page background).
 */
export function ScrollFadeRow({
  children,
  className,
  fadeClassName = "from-white",
  ...props
}: HTMLAttributes<HTMLDivElement> & { fadeClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  return (
    <div className="relative">
      <div ref={ref} className={cn("scrollbar-hide overflow-x-auto", className)} {...props}>
        {children}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r to-transparent transition-opacity",
          fadeClassName,
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent transition-opacity",
          fadeClassName,
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
