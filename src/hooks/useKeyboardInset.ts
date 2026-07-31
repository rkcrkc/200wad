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
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
