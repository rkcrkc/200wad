"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Lets ModalBody / ModalFooter coordinate their scroll behaviour with the shell
// without prop-drilling through the caller's composition. In the full-screen
// mobile variant the whole card scrolls (any leading page navbar + the title
// band scroll away with the body) and only the footer stays pinned; at md+ the
// shell reverts to the classic pinned-header / internally-scrolling-body modal.
const FullScreenOnMobileContext = createContext(false);

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
   * Below `md`, render as a full-screen page (no backdrop) that fills the whole
   * viewport. The whole card scrolls — a leading page navbar and the title band
   * scroll away with the body — and only the footer stays pinned to the bottom.
   * Callers own the top navbar by rendering it as the first child. At `md`+ it
   * behaves as the normal centered modal (pinned header, internally scrolling
   * body). Default: false (byte-for-byte unchanged).
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
          ? "fixed inset-0 z-50 flex items-stretch overflow-hidden bg-transparent md:items-center md:justify-center md:overflow-y-auto md:bg-black/50 md:p-6 md:backdrop-blur-sm"
          : "fixed inset-0 z-50 flex h-[100dvh] items-center justify-center overflow-y-auto bg-black/50 px-5 py-6 backdrop-blur-sm sm:p-6",
      )}
    >
      <div
        className={cn(
          fullScreenOnMobile
            ? cn(
                // On mobile the card is a fixed-height flex column: an inner
                // scroll region (navbar + header band + body) scrolls away while
                // the footer stays a static shrink-0 sibling pinned at the bottom
                // (more reliable than sticky, which detaches on iOS momentum
                // scroll). Mobile uses one continuous bone fill; md+ restores the
                // white modal card with an internally scrolling body.
                "flex h-full w-full flex-col overflow-hidden rounded-none bg-bone md:h-auto md:rounded-3xl md:bg-white",
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
        <FullScreenOnMobileContext.Provider value={fullScreenOnMobile}>
          {fullScreenOnMobile ? renderFullScreenChildren(children) : children}
        </FullScreenOnMobileContext.Provider>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Full-screen mobile layout: everything except the footer goes into an inner
 * scroll region (so the navbar + header band scroll away), and the footer is
 * rendered as a static shrink-0 sibling that stays pinned to the card bottom.
 * At md+ the wrapper collapses (`display: contents`) so the footer and body
 * become direct flex children of the card again — the classic modal layout.
 */
function renderFullScreenChildren(children: ReactNode) {
  const items = Children.toArray(children);
  const footer = items.find((c) => isValidElement(c) && c.type === ModalFooter);
  const rest = items.filter((c) => !(isValidElement(c) && c.type === ModalFooter));
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:contents">
        {rest}
      </div>
      {footer}
    </>
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
  const fullScreenOnMobile = useContext(FullScreenOnMobileContext);
  return (
    <div
      className={cn(
        "shrink-0 px-5 pt-8 pb-6 text-center sm:px-8 sm:pt-12 sm:pb-10",
        // Full-screen mobile pages drop the distinct tan band (it reads as part
        // of the white page); the tan returns at md+ where it's a modal header.
        fullScreenOnMobile ? "md:bg-[#EDE8DF]" : "bg-[#EDE8DF]",
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
  const fullScreenOnMobile = useContext(FullScreenOnMobileContext);
  // In the full-screen variant the card scrolls on mobile, so the body must NOT
  // be its own scroll container (that would pin the header); it fills space with
  // flex-1 to keep the footer at the bottom, and only scrolls internally at md+.
  const scrollableClass = fullScreenOnMobile
    ? "flex-1 p-4 sm:p-8 md:overflow-y-auto"
    : "flex-1 overflow-y-auto p-4 sm:p-8";
  return (
    <div
      className={cn(
        scrollable ? scrollableClass : "px-5 py-5 sm:px-8 sm:py-6",
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
  const fullScreenOnMobile = useContext(FullScreenOnMobileContext);
  return (
    <div
      className={cn(
        "shrink-0 bg-bone",
        // Full-screen mobile footer: pinned by the shell's flex column (static
        // shrink-0 sibling), so it needs a faint top border to separate it from
        // the scrolling content, tighter vertical padding, and a safe-area inset
        // for the home indicator. md+ restores the standard modal footer.
        fullScreenOnMobile
          ? "border-t border-black/5 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-8 md:border-t-0 md:py-6"
          : "px-5 py-5 sm:px-8 sm:py-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
