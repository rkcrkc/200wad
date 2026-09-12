"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import type { HeroLanguageTab, HeroTriggerCard } from "./heroTriggerData";

/** Split a headword into its (optional) article + the rest, for gender colour. */
function splitArticle(card: HeroTriggerCard): { article: string | null; rest: string } {
  const parts = card.headword.split(" ");
  if (card.gender && parts.length > 1) {
    return { article: parts[0], rest: parts.slice(1).join(" ") };
  }
  return { article: null, rest: card.headword };
}

function playAudio(src?: string) {
  if (!src) return;
  try {
    new Audio(src).play().catch(() => {});
  } catch {
    /* no-op — audio is a nice-to-have */
  }
}

/**
 * Hero memory-trigger demo: language tabs (FR/ES/DE/IT) above a left/right
 * carousel of trigger cards. Defaults to the first tab that actually has cards
 * (Italian for now) so the hero always shows a real trigger; other tabs show a
 * tidy "words coming" state until RC supplies the art.
 */
export function HeroTriggers({ languages }: { languages: HeroLanguageTab[] }) {
  const firstPopulated = useMemo(
    () => Math.max(0, languages.findIndex((l) => l.cards.length > 0)),
    [languages],
  );
  const [tab, setTab] = useState(firstPopulated);
  const [card, setCard] = useState(0);

  const active = languages[tab];
  const cards = active.cards;
  const current = cards[card];

  const goTab = (i: number) => {
    setTab(i);
    setCard(0);
  };
  const step = (dir: 1 | -1) => {
    if (cards.length === 0) return;
    setCard((c) => (c + dir + cards.length) % cards.length);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Language tabs */}
      <div className="mb-4 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Language">
        {languages.map((lang, i) => (
          <button
            key={lang.slug}
            role="tab"
            aria-selected={i === tab}
            onClick={() => goTab(i)}
            className={`pill ${i === tab ? "yellow" : ""} !text-sm`}
          >
            <span aria-hidden>{lang.flag}</span> {lang.name}
          </button>
        ))}
      </div>

      {/* Carousel */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => step(-1)}
          disabled={cards.length === 0}
          aria-label="Previous word"
          className="btn ghost !px-2 !py-2 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          {current ? (
            <figure className={`panel ${card % 2 === 1 ? "tilt-r" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">
                  {active.flag} {active.name}
                </span>
                <span className="eyebrow">
                  {card + 1} / {cards.length}
                </span>
              </div>

              <p className="mt-3 eyebrow">The word for</p>
              <p className="text-xl font-bold leading-tight">{current.english} is…</p>

              <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold">
                <HeadwordArticle card={current} />
                {current.audio && (
                  <button
                    onClick={() => playAudio(current.audio)}
                    aria-label={`Hear ${current.headword}`}
                    className="btn ghost !px-2 !py-1"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
              </p>
              <p className="eyebrow">{current.phonetic}</p>

              <p className="mt-3 text-[15px] ink-soft">
                which sounds like <span className="mark font-semibold">{current.soundsLike}</span>
              </p>

              <p className="mt-3 eyebrow">So just imagine…</p>
              <p className="text-[15px] font-medium">{current.imagine}</p>

              <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[8px] border-2 border-[var(--ink)] bg-white">
                <Image
                  src={current.image}
                  alt={current.alt}
                  fill
                  sizes="(max-width: 640px) 90vw, 420px"
                  className="object-contain"
                  priority
                />
              </div>

              {current.genderObject && (
                <p className="mt-3 text-[13px] ink-soft">
                  The {current.genderObject} lets you know it&rsquo;s{" "}
                  <span className={current.gender === "f" ? "text-la font-semibold" : "text-le font-semibold"}>
                    {current.gender === "f" ? "feminine" : "masculine"}
                  </span>
                  .
                </p>
              )}
              {current.sentence && (
                <p className="mt-2 text-[13px]">
                  <span className="quote">{current.sentence}</span>{" "}
                  <span className="ink-soft">— {current.sentenceEnglish}</span>
                </p>
              )}
            </figure>
          ) : (
            <div className="panel grid min-h-[320px] place-items-center text-center">
              <div>
                <p className="text-4xl" aria-hidden>
                  {active.flag}
                </p>
                <p className="mt-3 text-lg font-bold">{active.name} triggers coming soon</p>
                <p className="mt-1 text-[14px] ink-soft">
                  The cartoons are on their way. Peek at the Italian ones in the meantime.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => step(1)}
          disabled={cards.length === 0}
          aria-label="Next word"
          className="btn ghost !px-2 !py-2 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Dots */}
      {cards.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {cards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setCard(i)}
              aria-label={`Go to word ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full border-2 border-[var(--ink)] ${
                i === card ? "bg-[var(--ink)]" : "bg-transparent"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HeadwordArticle({ card }: { card: HeroTriggerCard }) {
  const { article, rest } = splitArticle(card);
  if (!article) return <span>{card.headword}</span>;
  return (
    <span>
      <span className={card.gender === "f" ? "text-la" : "text-le"}>{article}</span> {rest}
    </span>
  );
}
