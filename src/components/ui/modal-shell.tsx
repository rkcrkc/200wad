"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type MaxWidth = "md" | "content-sm" | "content-ms" | "content-md" | "content-lg";

const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  md: "max-w-md",
  "content-sm": "max-w-content-sm",
  "content-ms": "max-w-content-ms",
  "content-md": "max-w-content-md",
  "content-lg": "max-w-content-lg",
};

// md-prefixed variants for the full-screen-on-mobile shell. Kept as literal
// strings (not interpolated) so Tailwind's JIT can detect and generate them.
const MD_MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  md: "md:max-w-md",
  "content-sm": "md:max-w-content-sm",
  "content-ms": "md:max-w-content-ms",
  "content-md": "md:max-w-content-md",
  "content-lg": "md:max-w-content-lg",
};

interface ModalShellProps {
  /** Modal width preset. Default: "content-sm" */
  maxWidth?: MaxWidth;
  /** Apply fixed height (h-[720px] max-h-[90vh]) for full layout modals. Default: false */
  fixedHeight?: boolean;
  /** Lock body scroll while mounted. Default: true */
  lockBodyScroll?: boolean;
  /**
   * Below `md`, render as a full-screen page below the 72px fixed Header
   * (no backdrop, footer pins to the bottom); at `md`+ behave as the normal
   * centered modal. Default: false (byte-for-byte unchanged).
   */
  fullScreenOnMobile?: boolean;
  /** Outer card className override */
  className?: string;
  children: ReactNode;
}

/**
 * Reusable modal shell with backdrop overlay, body scroll lock, and rounded white card.
 * Compose with ModalHeader, ModalBody, and ModalFooter inside.
 */
export function ModalShell({
  maxWidth = "content-sm",
  fixedHeight = false,
  lockBodyScroll = true,
  fullScreenOnMobile = false,
  className,
  children,
}: ModalShellProps) {
  useEffect(() => {
    if (!lockBodyScroll) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lockBodyScroll]);

  // Portal to <body> so the fixed overlay escapes any scrollable/transformed
  // ancestor (e.g. the dashboard's `overflow-auto` <main>), which on iOS Safari
  // traps `position: fixed` children and clips the modal.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        fullScreenOnMobile
          ? "fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-stretch overflow-hidden bg-transparent md:inset-0 md:top-0 md:items-center md:justify-center md:overflow-y-auto md:bg-black/50 md:p-6 md:backdrop-blur-sm"
          : "fixed inset-0 z-50 flex h-[100dvh] items-center justify-center overflow-y-auto bg-black/50 px-5 py-6 backdrop-blur-sm sm:p-6",
      )}
    >
      <div
        className={cn(
          fullScreenOnMobile
            ? cn(
                "flex h-full w-full flex-col overflow-hidden rounded-none bg-white md:h-auto md:rounded-3xl",
                MD_MAX_WIDTH_CLASS[maxWidth],
                fixedHeight && "md:h-[720px] md:max-h-[90vh]",
              )
            : cn(
                "flex w-full flex-col overflow-hidden rounded-[2rem] bg-white sm:rounded-3xl",
                MAX_WIDTH_CLASS[maxWidth],
                fixedHeight && "max-h-[92dvh] sm:h-[720px] sm:max-h-[90vh]",
              ),
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface ModalHeaderProps {
  className?: string;
  children: ReactNode;
}

/**
 * Tan-colored modal header section. Default padding: px-8 pt-12 pb-10, text-center.
 * Pass className to override (e.g. compact variant).
 */
export function ModalHeader({ className, children }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        "shrink-0 bg-[#EDE8DF] px-5 pt-8 pb-6 text-center sm:px-8 sm:pt-12 sm:pb-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ModalBodyProps {
  /** Make body scrollable and fill available space (for fixedHeight modals). Default: false */
  scrollable?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Modal body content area. Default padding: px-8 py-6.
 * Set scrollable=true inside fixedHeight modals to fill space and overflow.
 */
export function ModalBody({ scrollable = false, className, children }: ModalBodyProps) {
  return (
    <div
      className={cn(
        scrollable ? "flex-1 overflow-y-auto p-4 sm:p-8" : "px-5 py-5 sm:px-8 sm:py-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ModalFooterProps {
  className?: string;
  children: ReactNode;
}

/**
 * Bone-colored modal footer section. Default padding: px-8 py-6.
 */
export function ModalFooter({ className, children }: ModalFooterProps) {
  return (
    <div className={cn("shrink-0 bg-bone px-5 py-5 sm:px-8 sm:py-6", className)}>
      {children}
    </div>
  );
}
