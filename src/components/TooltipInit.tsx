"use client";

import { useEffect } from "react";

export function TooltipInit() {
  useEffect(() => {
    const stored = localStorage.getItem("show-tooltips");
    if (stored === "false") {
      document.body.classList.add("hide-tooltips");
    }
  }, []);

  return null;
}
