"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type MaxWidth = "md" | "content-sm" | "content-ms" | "content-md" | "content-lg";

const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  md: "max-w-md",
  "content-sm": "max-w-content-sm",
  "content-ms": "max-w-content-ms",
  "content-md": "max-w-content-md",
  "content-lg": "max-w-content-lg",
};

interface ModalShellProps {
  /** Modal width preset. Default: "content-sm" */
  maxWidth?: MaxWidth;
  /** Apply fixed height (h-[720px] max-h-[90vh]) for full layout modals. Default: false */
  fixedHeight?: boolean;
  /** Lock body scroll while mounted. Default: true */
  lockBodyScroll?: boolean;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-3xl bg-white",
          MAX_WIDTH_CLASS[maxWidth],
          fixedHeight && "h-[720px] max-h-[90vh]",
          className,
        )}
      >
        {children}
      </div>
    </div>
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
        "shrink-0 bg-[#EDE8DF] px-8 pt-12 pb-10 text-center",
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
        scrollable ? "flex-1 overflow-y-auto p-8" : "px-8 py-6",
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
    <div className={cn("shrink-0 bg-bone px-8 py-6", className)}>
      {children}
    </div>
  );
}
