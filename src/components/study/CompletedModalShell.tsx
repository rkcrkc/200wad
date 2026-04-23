"use client";

import { useEffect, type ReactNode, type MouseEvent } from "react";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onClick={handleBackdropClick}
    >
      {/*
        The modal itself is the scroll container (overflow-y-auto). h-[90dvh] is
        the preferred height, capped at viewport-minus-outer-padding so short
        viewports never overflow. The footer uses `sticky bottom-0` so the action
        bar stays pinned even when header + body + footer exceed the modal height.
      */}
      <div className="relative flex h-[90dvh] max-h-[calc(100dvh-2rem)] w-full max-w-content-md flex-col overflow-y-auto overscroll-contain rounded-3xl bg-white sm:max-h-[calc(100dvh-3rem)]">
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
  // Body no longer has its own scroll container — the outer modal scrolls.
  // flex-1 (without min-h-0) means body fills the remaining modal height when
  // there's room, but can grow past it when content is tall; the modal then
  // scrolls to reveal the overflow.
  return <div className="flex-1 bg-bone p-8">{children}</div>;
}

function Footer({ children }: { children: ReactNode }) {
  // `sticky bottom-0` pins the action bar to the bottom of the modal viewport
  // even when header + body + footer exceed the modal height. The small negative
  // top shadow fades scrolling content into the footer for a subtle cue.
  return (
    <div className="sticky bottom-0 z-10 bg-bone px-8 py-6 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  );
}

CompletedModalShell.Header = Header;
CompletedModalShell.StatsBar = StatsBar;
CompletedModalShell.Body = Body;
CompletedModalShell.Footer = Footer;
