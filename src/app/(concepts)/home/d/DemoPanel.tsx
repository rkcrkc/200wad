"use client";

import Image from "next/image";
import { Volume2 } from "lucide-react";
import { DemoAnswerBar } from "@/components/marketing/demo/DemoAnswerBar";
import { DEMO_WORDS } from "@/components/marketing/demo/demoWords";
import { playDemoAudio, useAutoDemo } from "@/components/marketing/demo/useAutoDemo";

const PHASE_LABEL = {
  learn: "Exhibit A — learn it",
  test: "Tomorrow — prove it",
  payoff: "Still there",
} as const;

/** Concept D hero demo: the same engine skinned as a tilted comic panel. */
export function DemoPanel() {
  const { word, index, phase, typedCount, reduced, setPaused, total } =
    useAutoDemo(DEMO_WORDS);

  return (
    <div
      className="relative mx-auto w-full max-w-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="panel">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">{PHASE_LABEL[phase]}</span>
          <span className="eyebrow">🇮🇹 Italian</span>
        </div>

        <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[8px] border-2 border-[var(--ink)] bg-white">
          <Image
            src={word.image}
            alt={word.alt}
            fill
            sizes="(max-width: 1024px) 90vw, 440px"
            className="object-contain"
            priority={index === 0}
          />
        </div>

        <div className="mt-3 min-h-[128px]">
          {phase === "learn" && (
            <div>
              <p className="text-[15px] leading-snug">
                {word.trigger.map((seg, i) =>
                  seg.highlight ? (
                    <span key={i} className="mark font-semibold">
                      {seg.text}
                    </span>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label={`Play the Italian pronunciation of ${word.headword}`}
                  onClick={() => playDemoAudio(word.audio)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--card)] shadow-[2px_2px_0_var(--ink)]"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <p className="text-lg font-bold">
                  {word.gender ? (
                    <span className={word.gender === "f" ? "text-la" : "text-le"}>
                      {word.headword}
                    </span>
                  ) : (
                    word.headword
                  )}{" "}
                  <span className="font-normal ink-soft">— {word.english}</span>
                </p>
              </div>
              <p className="eyebrow mt-1.5">“{word.phonetic}”</p>
            </div>
          )}

          {phase !== "learn" && (
            <div>
              <p className="text-[15px]">
                Right then. The Italian for <strong>{word.english}</strong>?
              </p>
              {/* The genuine app answer bar, deliberately un-skinned: the demo
                  shows the real product UI inside the comic panel. */}
              <div className="mt-3">
                <DemoAnswerBar phase={phase} word={word} typedCount={typedCount} />
              </div>
              {phase === "test" ? (
                <p className="eyebrow mt-2">The picture comes back first.</p>
              ) : (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="pill yellow">★ 1 of 3 perfect</span>
                  <span className="eyebrow">3 in a row = mastered</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--ink)]"
              style={{ background: i === index ? "var(--accent)" : "var(--card)" }}
            />
          ))}
        </div>
      </div>

      {reduced && (
        <p className="eyebrow mt-3 text-center">Three words, thirty seconds — try them free.</p>
      )}
    </div>
  );
}
