"use client";

import { useEffect, useState } from "react";

/**
 * Returns the height (in px) of the on-screen keyboard currently overlapping the
 * bottom of the layout viewport. 0 when no keyboard is shown or on platforms that
 * resize the layout viewport (most Android configs) rather than overlaying it.
 *
 * Fixed bottom bars sit at `bottom: 0` of the *layout* viewport. On iOS Safari the
 * layout viewport stays put while the *visual* viewport shrinks, so a `bottom-0`
 * bar is hidden behind the keyboard. Applying this inset as the bar's `bottom`
 * offset floats it directly above the keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, Math.round(overlap)));
    };

    update();
    // Only react to `resize` (keyboard open/close), not `scroll`. On iOS Safari
    // a fixed bottom bar becomes visual-viewport-relative once the keyboard is
    // up; tracking `vv.scroll` made the bar chase the scroll offset and stick
    // mid-screen. Reacting to resize alone keeps the inset pinned to the
    // keyboard height for the session.
    vv.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
    };
  }, []);

  return inset;
}
