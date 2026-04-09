"use client";

import { useState, useEffect, useCallback } from "react";

type PageWidth = "md" | "lg";

const STORAGE_KEY = "page-width";
const DEFAULT_WIDTH: PageWidth = "md";

function getStoredWidth(): PageWidth {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "md" || stored === "lg" ? stored : DEFAULT_WIDTH;
}

export function usePageWidth() {
  const [width, setWidth] = useState<PageWidth>(getStoredWidth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setWidth((prev) => {
      const next: PageWidth = prev === "md" ? "lg" : "md";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { width, toggle, mounted } as const;
}
