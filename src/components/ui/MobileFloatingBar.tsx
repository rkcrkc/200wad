"use client";

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const MOBILE_MQ = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(MOBILE_MQ);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
const getSnapshot = () => window.matchMedia(MOBILE_MQ).matches;
// Render inline on the server / during hydration; the client resolves the real
// breakpoint after mount.
const getServerSnapshot = () => false;

/**
 * Docks its children to the bottom of the viewport on mobile and renders them
 * inline (normal document flow) on desktop (md+). Use for a single primary
 * callout/CTA that should stay reachable while a mobile page scrolls, yet read
 * as ordinary in-flow content on desktop.
 *
 * Why a portal (mobile): the app's page content scrolls inside an
 * `overflow-auto` <main>. iOS Safari mis-positions `position: fixed`
 * descendants of a scroll container (anchoring them to the scroll content
 * rather than the viewport), which makes an in-place fixed bar float mid-screen
 * with a gap. Portaling to <body> pins the bar to the real viewport bottom.
 *
 * Clearance: the fixed bar overlaps page content, so the scrollable page must
 * reserve matching space at the *end* of its content. This component publishes
 * its live height to the `--floating-bar-h` CSS custom property (0px on desktop
 * / when unmounted); the consuming page reserves it, e.g.
 * `style={{ paddingBottom: "var(--floating-bar-h, 0px)" }}`.
 *
 * Distinct from `CheckoutFooterBar` / `WordDetailActionBar`, which are *always*
 * fixed (all breakpoints) and sidebar-offset aware. This is a mobile-only dock
 * that collapses back into the flow at md+.
 */
export function MobileFloatingBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const isMobile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const barRef = useRef<HTMLDivElement>(null);

  // Publish the live bar height so the page can reserve matching clearance.
  useEffect(() => {
    const root = document.documentElement;
    if (!isMobile) {
      root.style.setProperty("--floating-bar-h", "0px");
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const publish = () =>
      root.style.setProperty("--floating-bar-h", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--floating-bar-h", "0px");
    };
  }, [isMobile]);

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return createPortal(
    <div
      ref={barRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
