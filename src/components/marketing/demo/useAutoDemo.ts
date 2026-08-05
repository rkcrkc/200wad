"use client";

import { useEffect, useState } from "react";
import type { DemoWord } from "./demoWords";

export type DemoPhase = "learn" | "test" | "payoff";

const LEARN_MS = 4200;
const TYPE_START_MS = 700;
const TYPE_CHAR_MS = 95;
const TYPED_HOLD_MS = 800;
const PAYOFF_MS = 2000;

/**
 * Headless engine for the auto-playing hero demo: learn → ghost-typed test →
 * payoff, cycling through the words forever. Non-interactive by design — the
 * visitor watches the method work. Pauses on hover; renders a static learn
 * frame under prefers-reduced-motion (and before hydration, for free).
 */
export function useAutoDemo(words: DemoWord[]) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>("learn");
  const [typedCount, setTypedCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const word = words[index];
  const answerLength = word.headword.length;

  // Phase driver. Cleared (and later resumed from current state) while paused.
  useEffect(() => {
    if (paused || reduced) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | undefined;

    if (phase === "learn") {
      timeouts.push(setTimeout(() => setPhase("test"), LEARN_MS));
    } else if (phase === "test") {
      timeouts.push(
        setTimeout(
          () => {
            interval = setInterval(() => {
              setTypedCount((c) => (c >= answerLength ? c : c + 1));
            }, TYPE_CHAR_MS);
          },
          typedCount === 0 ? TYPE_START_MS : 0
        )
      );
    } else {
      timeouts.push(
        setTimeout(() => {
          setTypedCount(0);
          setIndex((i) => (i + 1) % words.length);
          setPhase("learn");
        }, PAYOFF_MS)
      );
    }

    return () => {
      timeouts.forEach(clearTimeout);
      if (interval !== undefined) clearInterval(interval);
    };
    // typedCount deliberately omitted: typing progresses via the interval;
    // re-running this effect on every character would restart the start delay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, paused, reduced, answerLength, words.length]);

  // When the ghost has typed the full answer, hold briefly then pay off.
  useEffect(() => {
    if (phase !== "test" || paused || reduced) return;
    if (typedCount < answerLength) return;
    const t = setTimeout(() => setPhase("payoff"), TYPED_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, typedCount, paused, reduced, answerLength]);

  return { word, index, phase, typedCount, reduced, setPaused, total: words.length };
}

let currentAudio: HTMLAudioElement | null = null;

/** Plays a demo clip, stopping any clip already playing. Click-only — never autoplayed. */
export function playDemoAudio(src: string) {
  currentAudio?.pause();
  currentAudio = new Audio(src);
  void currentAudio.play().catch(() => {
    // Autoplay policies can reject even click-triggered play in edge cases; fail silently.
  });
}
