"use client";

import { useEffect, useState } from "react";

interface RotatingWordProps {
  words: string[];
  /** ms each word stays visible */
  interval?: number;
  className?: string;
}

/**
 * Cycles through words with a soft fade — used for the hero's rotating
 * language token ("Finally remember your {French → Spanish → …} vocab").
 * Respects prefers-reduced-motion by skipping the fade.
 */
export function RotatingWord({ words, interval = 2200, className }: RotatingWordProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (words.length <= 1) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
      return () => clearInterval(id);
    }

    const id = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setVisible(true);
      }, 260);
      return () => clearTimeout(t);
    }, interval);
    return () => clearInterval(id);
  }, [words, interval]);

  return (
    <span
      className={`inline-block text-primary transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className ?? ""}`}
      // Reserve width so the line doesn't reflow as words change.
      style={{ minWidth: "1ch" }}
      aria-live="polite"
    >
      {words[index]}
    </span>
  );
}
