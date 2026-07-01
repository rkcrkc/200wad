"use client";

import { useEffect } from "react";

/**
 * Close a modal on Escape. Pass `enabled = false` to suspend closing (e.g.
 * while a network request is in flight).
 */
export function useModalClose(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose, enabled]);
}
