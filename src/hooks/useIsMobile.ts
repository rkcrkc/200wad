"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's `max-md:` (below the `md` breakpoint of 768px), so JS-driven
// responsive behaviour stays in lockstep with the class-based one.
const MOBILE_MQ = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(MOBILE_MQ);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

const getSnapshot = () => window.matchMedia(MOBILE_MQ).matches;
// Render the desktop branch on the server / during hydration; the client
// resolves the real breakpoint after mount.
const getServerSnapshot = () => false;

/** True when the viewport is below the `md` breakpoint (mobile). */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
