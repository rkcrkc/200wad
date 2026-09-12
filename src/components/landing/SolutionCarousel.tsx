"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { genderColorDark, defaultHighlightColorDark } from "@/lib/design-tokens";
import type { SolutionCardData } from "./solutionCardsData";

/** Leading articles stripped when checking a typed answer, so "chou" is accepted
 *  for "le chou" (and the gendered equivalents across all four languages). */
const ARTICLES = new Set([
  "le", "la", "les", "l", "un", "une", // French
  "el", "los", "las", // Spanish
  "il", "lo", "gli", "i", // Italian
  "der", "die", "das", // German
]);

/** Case/accent-insensitive comparison key: lowercase, strip diacritics, collapse
 *  whitespace. So "Sonne" == "sonne", "fràgola" == "fragola". */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** The set of typed strings accepted for a headword: the full form, plus the form
 *  with a leading article dropped (learners often type just the noun). */
function acceptedAnswers(headword: string): Set<string> {
  const full = normalize(headword);
  const out = new Set([full]);
  const parts = full.split(" ");
  if (parts.length > 1 && ARTICLES.has(parts[0])) {
    out.add(parts.slice(1).join(" "));
  }
  return out;
}

type Status = "idle" | "correct" | "wrong";

/**
 * A single Section-5 word card: the same anatomy as the hero Word Demo Card
 * (English + foreign headword, cartoon, "Imagine…" trigger, answer bar) but
 * smaller, fully static — and instead of ghost-typing the answer, the learner
 * types it themselves and gets live correct/try-again feedback.
 */
function SolutionCard({ card, tiltClass }: { card: SolutionCardData; tiltClass: string }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const foreignColor =
    (card.gender && genderColorDark[card.gender]) || defaultHighlightColorDark;

  const check = () => {
    if (!value.trim()) return;
    setStatus(acceptedAnswers(card.headword).has(normalize(value)) ? "correct" : "wrong");
  };

  const borderClass =
    status === "correct"
      ? "border-[var(--success)]"
      : status === "wrong"
        ? "border-[var(--destructive)]"
        : "border-[var(--ink)] focus-within:border-[var(--accent)]";

  return (
    <figure className={`card flex w-[300px] shrink-0 snap-center flex-col p-5 sm:w-[340px] ${tiltClass}`}>
      {/* Word — English meaning above the foreign headword, each with a static
          leading emoji slot (no audio controls in this smaller variant). */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="grid size-5 shrink-0 place-items-center text-[18px] leading-none" aria-hidden>
            🇬🇧
          </span>
          <p className="heading-s text-[var(--ink)]">{card.english}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid size-5 shrink-0 place-items-center text-[18px] leading-none" aria-hidden>
            {card.flag}
          </span>
          <p className="heading-s" style={{ color: foreignColor }}>
            {card.headword}
          </p>
        </div>
      </div>

      {/* Memory-trigger cartoon. */}
      {card.image ? (
        <div className="relative mt-3 h-[176px] overflow-hidden rounded-[16px] bg-[rgba(246,241,230,0.4)]">
          <Image
            src={card.image}
            alt={card.alt}
            fill
            sizes="336px"
            className="object-contain"
          />
        </div>
      ) : (
        <div className="mt-3 grid h-[176px] place-items-center rounded-[16px] bg-[rgba(246,241,230,0.4)] px-6 text-center">
          <p className="text-[13px] font-medium text-[var(--mono-soft)]">Cartoon coming soon</p>
        </div>
      )}

      {/* "Imagine…" trigger. */}
      <div className="mt-3 min-h-[68px]">
        <p className="pl-8 text-[13px] font-medium tracking-[-0.01em] text-[var(--mono-soft)]">
          Imagine…
        </p>
        <div className="mt-1 flex items-start gap-3">
          <span className="grid size-5 shrink-0 place-items-center text-[18px] leading-none" aria-hidden>
            💡
          </span>
          <p className="text-[15px] font-semibold leading-[1.35] tracking-[-0.01em] text-[var(--ink)]">
            {card.imagine}
          </p>
        </div>
      </div>

      {/* Answer bar — the learner types the foreign word and presses Enter (or the
          check arrow) to grade it. Border + trailing slot reflect the result. */}
      <div
        className={`mt-3 flex items-center gap-2 rounded-[16px] border-2 bg-white px-4 py-[10px] transition-colors ${borderClass}`}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              check();
            }
          }}
          placeholder={`Type the ${card.langName}…`}
          aria-label={`Type the ${card.langName} for ${card.english}`}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="label-lg min-w-0 flex-1 bg-transparent text-[var(--ink)] placeholder:text-[var(--mono-soft)] focus:outline-none"
        />
        {status === "correct" ? (
          <span className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-[var(--success)]">
            ✅ Correct! 🙌
          </span>
        ) : status === "wrong" ? (
          <span className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-[var(--destructive)]">
            Try again
          </span>
        ) : (
          <button
            type="button"
            onClick={check}
            aria-label="Check answer"
            className="grid size-6 shrink-0 place-items-center rounded-full text-[var(--mono-soft)] transition-colors hover:text-[var(--ink)]"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </figure>
  );
}

/**
 * Section 5 carousel — a horizontally scroll-snapping, swipeable row of typable
 * word cards. Native touch/trackpad swipe drives it; on desktop the flanking
 * arrow buttons nudge it one card at a time via scrollBy.
 */
export function SolutionCarousel({ cards }: { cards: SolutionCardData[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // One card + gap (card is 336px at sm; step by ~360 to clear the 24px gap).
    el.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* items-start so each card sizes to its own content (no equal-height
          stretch leaving a gap below the input bar); py-6 gives the tilted cards
          + their 5px offset shadow room before the scroller clips. */}
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory items-start gap-[30px] overflow-x-auto px-6 py-6 lg:px-20 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, i) => (
          <SolutionCard
            key={`${card.langName}-${card.id}`}
            card={card}
            tiltClass={i % 2 === 0 ? "rotate-[2.15deg]" : "-rotate-3"}
          />
        ))}
      </div>

      {/* Desktop nudge arrows — hidden on touch/small where native swipe leads. */}
      <button
        type="button"
        onClick={() => nudge(-1)}
        aria-label="Previous word"
        className="arrow absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-2 border-[var(--ink)] bg-white lg:grid"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        aria-label="Next word"
        className="arrow absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-2 border-[var(--ink)] bg-white lg:grid"
      >
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
