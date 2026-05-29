"use client";

import { useEffect } from "react";

export function TooltipInit() {
  useEffect(() => {
    const storedTooltips = localStorage.getItem("show-tooltips");
    if (storedTooltips === "false") {
      document.body.classList.add("hide-tooltips");
    }

    const storedRelated = localStorage.getItem("show-related-words");
    if (storedRelated === "false") {
      document.body.classList.add("hide-related-words");
    }
  }, []);

  return null;
}
