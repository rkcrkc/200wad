"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Trophy } from "lucide-react";

const TARGET = "fragola";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Right-hand visual for the Testing & Progress section: a single brand card
 * that folds together all three feature highlights — an auto-typing test bar
 * ("Test yourself"), a "word mastered" toast ("See your progress") and a
 * self-drawing vocab-growth chart ("Grow your vocab").
 */
export function ProgressShowcase() {
  const reduced = usePrefersReducedMotion();

  // Single ticking clock drives the typing + correct/reset loop.
  const cycle = TARGET.length + 7; // type out, then hold the "correct" state
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % cycle), 240);
    return () => clearInterval(id);
  }, [reduced, cycle]);

  const typed = reduced ? TARGET.length : Math.min(step, TARGET.length);
  const correct = reduced ? true : step >= TARGET.length;

  return (
    <div className="card p-5 sm:p-6">
      {/* Grow your vocab — chart */}
      <div className="flex items-center justify-between">
        <span className="eyebrow">Your vocabulary</span>
        <span className="pill yellow !py-1 !text-[13px]">1,240 words</span>
      </div>
      <VocabChart reduced={reduced} />

      {/* See your progress — mastered toast */}
      <div
        className={`mt-4 flex items-center gap-3 rounded-[10px] border-2 border-[var(--ink)] px-4 py-3 transition-all ${
          correct ? "opacity-100" : "opacity-40"
        }`}
        style={{ background: "var(--pink-soft)" }}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--marker)]">
          <Trophy className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold">Word mastered! 🎉</p>
          <p className="text-[13px] ink-soft">Correct 3 times in a row · +30 XP</p>
        </div>
      </div>

      {/* Test yourself — animated input bar */}
      <div className="mt-4">
        <span className="eyebrow">Test yourself</span>
        <div
          className={`mt-2 flex items-center justify-between gap-3 rounded-[10px] border-2 border-[var(--ink)] bg-white px-4 py-3 ${
            correct ? "!border-[color:var(--accent)]" : ""
          }`}
        >
          <span className="font-mono text-lg">
            {TARGET.slice(0, typed)}
            {!correct && <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-[var(--ink)]">&nbsp;</span>}
          </span>
          {correct ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-bold text-[color:var(--accent)]">
              <Check className="h-4 w-4" /> Correct! +3 XP
            </span>
          ) : (
            <span className="eyebrow">strawberry →</span>
          )}
        </div>
      </div>
    </div>
  );
}

function VocabChart({ reduced }: { reduced: boolean }) {
  // A rising cumulative curve, normalised to a 300×120 viewbox.
  const line =
    "M0,116 C40,112 70,100 100,92 C140,80 165,74 200,58 C235,42 260,30 300,10";
  const area = `${line} L300,120 L0,120 Z`;
  return (
    <svg viewBox="0 0 300 120" className="mt-2 h-28 w-full" role="img" aria-label="Vocabulary growing over time">
      <defs>
        <linearGradient id="e-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--marker)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--marker)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#e-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={3}
        strokeLinecap="round"
        pathLength={1}
        className={reduced ? undefined : "chart-line"}
      />
      <circle cx={300} cy={10} r={5} fill="var(--accent)" stroke="var(--ink)" strokeWidth={2} />
    </svg>
  );
}
