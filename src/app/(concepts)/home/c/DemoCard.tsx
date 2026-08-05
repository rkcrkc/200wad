"use client";

import Image from "next/image";
import { Volume2 } from "lucide-react";
import { DemoAnswerBar } from "@/components/marketing/demo/DemoAnswerBar";
import { DEMO_WORDS } from "@/components/marketing/demo/demoWords";
import { playDemoAudio, useAutoDemo } from "@/components/marketing/demo/useAutoDemo";

const PHASE_LABEL = {
  learn: "Step 1 · See it",
  test: "Step 2 · Prove it",
  payoff: "It stuck",
} as const;

/** Concept C hero demo: app design system, auto-playing learn → test → payoff. */
export function DemoCard() {
  const { word, index, phase, typedCount, reduced, setPaused, total } =
    useAutoDemo(DEMO_WORDS);

  return (
    <div
      className="relative mx-auto w-full max-w-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-panel">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-bone px-3 py-1 text-small-medium text-foreground/60">
            🇮🇹 Italian · Lesson 1
          </span>
          <span
            className={
              phase === "payoff"
                ? "rounded-full bg-success px-3 py-1 text-xs-medium text-white"
                : "rounded-full bg-primary/10 px-3 py-1 text-xs-medium text-primary"
            }
          >
            {PHASE_LABEL[phase]}
          </span>
        </div>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border border-black/5 bg-white">
          <Image
            src={word.image}
            alt={word.alt}
            fill
            sizes="(max-width: 1024px) 90vw, 440px"
            className="object-contain"
            priority={index === 0}
          />
        </div>

        <div className="mt-4 min-h-[132px]">
          {phase === "learn" && (
            <div>
              <p className="text-small-regular text-foreground/70">
                {word.trigger.map((seg, i) =>
                  seg.highlight ? (
                    <span key={i} className="rounded bg-primary/10 px-1 font-medium text-primary">
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
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <p className="text-large-semibold">
                  {word.headword}{" "}
                  <span className="font-normal text-foreground/50">— {word.english}</span>
                </p>
              </div>
              <p className="mt-1 text-small-regular text-foreground/50">
                “{word.phonetic}”
                {word.gender && (
                  <span> · {word.gender === "f" ? "feminine" : "masculine"} — see who stars in the cartoon</span>
                )}
              </p>
            </div>
          )}

          {phase !== "learn" && (
            <div>
              <p className="text-small-medium text-foreground/60">
                Tomorrow&rsquo;s test — what&rsquo;s the Italian for{" "}
                <span className="font-semibold text-foreground">{word.english}</span>?
              </p>
              <div className="mt-3">
                <DemoAnswerBar phase={phase} word={word} typedCount={typedCount} />
              </div>
              {phase === "test" ? (
                <p className="mt-2 text-small-regular text-foreground/50">
                  The picture pops back first. Then the word.
                </p>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-2 flex-1 rounded-full ${i === 0 ? "bg-success" : "bg-black/10"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs-medium text-foreground/50">
                    1 of 3 perfect answers on the road to mastered
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-primary" : "w-1.5 bg-black/15"
              }`}
            />
          ))}
        </div>
      </div>

      {reduced && (
        <p className="mt-3 text-center text-small-regular text-foreground/50">
          Three words, thirty seconds — try them free.
        </p>
      )}
    </div>
  );
}
