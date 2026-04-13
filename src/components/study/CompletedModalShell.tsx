"use client";

import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";

interface CompletedModalShellProps {
  /** Called when the user dismisses via backdrop click or Escape key. */
  onDismiss: () => void;
  children: ReactNode;
}

/**
 * Generic shell for "X completed!" style modals (lesson, test, future).
 * Provides the overlay, card frame, backdrop/Escape dismissal, and named slots.
 * Knows nothing about domain concepts — compose with the attached sub-components:
 *
 *   <CompletedModalShell onDismiss={...}>
 *     <CompletedModalShell.Header eyebrow="..." title="...">...</CompletedModalShell.Header>
 *     <CompletedModalShell.StatsBar>...</CompletedModalShell.StatsBar>   // optional
 *     <CompletedModalShell.Body>...</CompletedModalShell.Body>
 *     <CompletedModalShell.Footer>...</CompletedModalShell.Footer>
 *   </CompletedModalShell>
 */
export function CompletedModalShell({ onDismiss, children }: CompletedModalShellProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  // Close on backdrop click (only when the click target is the backdrop itself)
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={handleBackdropClick}
    >
      <div className="flex h-[90vh] w-full max-w-content-md flex-col overflow-hidden rounded-3xl bg-white">
        {children}
      </div>
    </div>
  );
}

interface HeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  /** Optional meta row rendered under the title (e.g. duration, toggles). */
  children?: ReactNode;
}

function Header({ eyebrow, title, children }: HeaderProps) {
  return (
    <div className="shrink-0 bg-bone-hover px-8 pt-8 pb-6 text-center">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h1 className="mb-3 text-3xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

function StatsBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 cursor-default items-center justify-between bg-bone px-8 py-5 text-sm">
      {children}
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // Gradient hides when we're within 1px of the bottom, or when content
      // doesn't overflow (scrollHeight === clientHeight).
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 1);
    };

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });

    // Recheck if content size changes (e.g. image loads, tab switches)
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-bone">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8">
        {children}
      </div>
      {/* Gradient fade-out at bottom; hidden when scrolled to the end */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bone to-transparent transition-opacity duration-200 ${
          isAtBottom ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return <div className="shrink-0 bg-bone px-8 py-6">{children}</div>;
}

CompletedModalShell.Header = Header;
CompletedModalShell.StatsBar = StatsBar;
CompletedModalShell.Body = Body;
CompletedModalShell.Footer = Footer;
