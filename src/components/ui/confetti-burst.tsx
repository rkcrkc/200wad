"use client";

import { useEffect, useState } from "react";

interface ConfettiBurstProps {
  /** Called once the animation finishes so the parent can unmount. */
  onComplete?: () => void;
  /** Auto-cleanup duration in ms. Should exceed longest piece animation. */
  duration?: number;
}

/**
 * Fire-and-forget fullscreen confetti burst.
 *
 * Renders ~36 CSS-animated coloured squares falling from the top of the
 * viewport. Designed for in-session mastery moments (e.g. when a word's
 * `correct_streak` hits 3 during a test). The companion `CelebrationModal`
 * has its own scoped confetti for end-of-session celebrations; this
 * variant is for transient post-answer reveals where there is no modal.
 *
 * Parent owns mount lifecycle: render the component when a celebration
 * should fire (e.g. keyed by a bump-counter to retrigger) and unmount on
 * the `onComplete` callback.
 */
export function ConfettiBurst({ onComplete, duration = 2800 }: ConfettiBurstProps) {
  // Lazy state initializer is the React-blessed home for random/impure
  // setup that should run exactly once per mount. Each new <ConfettiBurst />
  // mount (driven by a parent bump-counter as `key`) gets a fresh shower.
  const [pieces] = useState(() => {
    const colors = ["#0b6cff", "#00c950", "#ff9224", "#fb2c36", "#a855f7", "#facc15"];
    return Array.from({ length: 36 }, (_, i) => ({
      i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.6 + Math.random() * 1.0,
      rotate: Math.random() * 360,
      color: colors[i % colors.length],
    }));
  });

  useEffect(() => {
    if (!onComplete) return;
    const t = setTimeout(onComplete, duration);
    return () => clearTimeout(t);
  }, [onComplete, duration]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <span
          key={p.i}
          className="confetti-burst-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <style>{`
        .confetti-burst-piece {
          position: absolute;
          top: -16px;
          width: 9px;
          height: 16px;
          opacity: 0.95;
          border-radius: 1px;
          animation-name: confetti-burst-fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
          animation-iteration-count: 1;
        }
        @keyframes confetti-burst-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(85vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
