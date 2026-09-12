"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ChevronRight, Pause, Play } from "lucide-react";
import { genderColorDark, defaultHighlightColorDark } from "@/lib/design-tokens";
import type { HeroLanguageTab, HeroTriggerCard } from "../e/heroTriggerData";

/** Animated equalizer — bars pulse height while audio is playing. */
function EqualizerIcon({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className ?? ""} ${playing ? "eq-on" : ""}`}
      aria-hidden
      fill="currentColor"
    >
      <rect className="eqbar" x="3" y="4" width="2.5" height="16" rx="1.25" />
      <rect className="eqbar" x="8.5" y="4" width="2.5" height="16" rx="1.25" />
      <rect className="eqbar" x="14" y="4" width="2.5" height="16" rx="1.25" />
      <rect className="eqbar" x="19.5" y="4" width="2.5" height="16" rx="1.25" />
    </svg>
  );
}

/**
 * A word/phrase that, while its step is active, fills left-to-right with `fill`
 * over `ms` (the length of its spoken clip). When inactive it renders as normal
 * ink text. Remounting on activation restarts the CSS sweep from the start.
 */
function Sweep({
  active,
  fill,
  ms,
  className,
  children,
}: {
  active: boolean;
  fill: string;
  ms: number;
  className?: string;
  children: React.ReactNode;
}) {
  if (!active) return <span className={className}>{children}</span>;
  return (
    <span
      className={`sweep ${className ?? ""}`}
      style={{ "--fill": fill, "--sweep-ms": `${ms}ms` } as CSSProperties}
    >
      {children}
    </span>
  );
}

/**
 * Reveal steps of the auto-play sequence — mirrors the real study flow. The
 * final "answer" step has no audio: it's when the demo ghost-types the Italian
 * into the answer bar, after the word and trigger have finished speaking.
 */
type Phase = "english" | "foreign" | "trigger" | "answer";
const PHASE_ORDER: Phase[] = ["english", "foreign", "trigger", "answer"];

/** How long each highlighted step holds before advancing (ms). */
const PHASE_MS: Record<Phase, number> = {
  english: 1500,
  foreign: 1700,
  trigger: 3400,
  answer: 1500, // room to type the word out, then show the correct state
};

/** Extra beat after the answer is typed, before the carousel moves on. */
const END_HOLD_MS = 2000;

/** The seeded audio clip for each step (the answer step is silent). */
function phaseAudio(card: HeroTriggerCard, phase: Phase): string | undefined {
  if (phase === "english") return card.audioEnglish;
  if (phase === "foreign") return card.audioForeign ?? card.audio;
  if (phase === "trigger") return card.audioTrigger;
  return undefined;
}

/**
 * Redesigned hero memory-trigger demo for Concept F: FR/ES/DE/IT tabs above a
 * single clean trigger card, flanked by circular prev/next arrows. The card
 * auto-plays like a study session — it highlights and speaks the English word,
 * then the foreign word, then the memory trigger, before cycling to the next
 * word. Hovering pauses it; reduced-motion users get a static card. Only the
 * Italian tab has real cartoons today; the others show a tidy "coming soon"
 * state until the art lands.
 */
export function HeroTrigger({ languages }: { languages: HeroLanguageTab[] }) {
  const firstPopulated = useMemo(
    () => Math.max(0, languages.findIndex((l) => l.cards.length > 0)),
    [languages],
  );
  const [tab, setTab] = useState(firstPopulated);
  const [card, setCard] = useState(0);
  const [phase, setPhase] = useState<Phase>("english");
  const [paused, setPaused] = useState(false); // transient hover pause
  const [userPaused, setUserPaused] = useState(false); // explicit play/pause control
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true); // sound off until the user opts in
  const [typed, setTyped] = useState(0); // ghost-typed characters in the answer bar

  const active = languages[tab];
  const cards = active.cards;
  const current = cards[card];

  // Honour prefers-reduced-motion: no auto-play, no audio, everything static.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Single audio element, reused so a new step interrupts the previous clip.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playClip = useCallback((src?: string) => {
    if (!src) {
      setPlaying(false);
      return;
    }
    try {
      audioRef.current?.pause();
      const a = new Audio(src);
      audioRef.current = a;
      setPlaying(true);
      a.addEventListener("ended", () => {
        if (audioRef.current === a) setPlaying(false);
      });
      void a.play().catch(() => {
        if (audioRef.current === a) setPlaying(false);
      });
    } catch {
      /* audio is a nice-to-have */
      setPlaying(false);
    }
  }, []);

  const goTo = useCallback((next: number) => {
    setCard(next);
    setPhase("english");
    setTyped(0);
  }, []);
  const goTab = (i: number) => {
    setTab(i);
    goTo(0);
  };
  const step = (dir: 1 | -1) => {
    if (cards.length === 0) return;
    goTo((card + dir + cards.length) % cards.length);
  };

  // Toggle the auto-play sequence. Pausing also stops any sounding clip.
  const togglePlay = () => {
    const next = !userPaused;
    setUserPaused(next);
    if (next) {
      audioRef.current?.pause();
      setPlaying(false);
    }
  };

  // Toggle sound. Turning it on plays the current step immediately; turning it
  // off stops any clip and settles the equalizer.
  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    if (next) {
      audioRef.current?.pause();
      setPlaying(false);
    } else if (current) {
      playClip(phaseAudio(current, phase));
    }
  };

  // Play the current step's clip whenever the phase (or card) changes. Deferred
  // a tick so the play (and its setState) runs after the effect settles.
  useEffect(() => {
    if (reduced || muted || !current) return;
    const id = setTimeout(() => playClip(phaseAudio(current, phase)), 0);
    return () => clearTimeout(id);
  }, [reduced, muted, current, phase, playClip]);

  // Drive the sequence: hold each phase, then advance; after the trigger, cycle
  // to the next card. Pausing (hover) or reduced-motion stops the timer.
  useEffect(() => {
    if (reduced || paused || userPaused || !current) return;
    const idx = PHASE_ORDER.indexOf(phase);
    const isLast = idx === PHASE_ORDER.length - 1;
    const timer = setTimeout(
      () => {
        if (isLast) {
          goTo((card + 1) % cards.length);
        } else {
          setPhase(PHASE_ORDER[idx + 1]);
        }
      },
      PHASE_MS[phase] + (isLast ? END_HOLD_MS : 0),
    );
    return () => clearTimeout(timer);
  }, [reduced, paused, userPaused, current, phase, card, cards.length, goTo]);

  // Ghost-type the Italian headword into the answer bar, one letter at a time,
  // but only once the word and trigger clips have finished (the "answer" phase).
  // Resets to empty on each new card (via goTo).
  useEffect(() => {
    if (reduced || paused || userPaused || !current) return;
    if (phase !== "answer") return;
    if (typed >= current.headword.length) return;
    const id = setTimeout(() => setTyped((t) => t + 1), 90);
    return () => clearTimeout(id);
  }, [reduced, paused, userPaused, current, phase, typed]);

  const isActive = (p: Phase) => !reduced && phase === p;
  // The answer bar reads as "answered" once the whole word is typed (or straight
  // away for reduced-motion users, who see the completed state).
  const answered = reduced || (!!current && typed >= current.headword.length);
  // The bars wave while a clip sounds; when muted they wave continuously (at
  // reduced opacity) so the icon still reads as "audio", just switched off. They
  // settle during the silent "answer" phase, where no clip plays.
  const waving =
    phase !== "answer" &&
    (muted ? !reduced && !!current && !paused && !userPaused : playing);
  // English + trigger sweep-fill blue; the foreign word follows the app's gender
  // playback colours (masculine blue, feminine red, verb green).
  const foreignColor = current
    ? (current.gender && genderColorDark[current.gender]) || defaultHighlightColorDark
    : defaultHighlightColorDark;

  return (
    <div className="w-full">
      {/* Language tabs */}
      <div className="mb-5 flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Language">
        {languages.map((lang, i) => (
          <button
            key={lang.slug}
            role="tab"
            aria-selected={i === tab}
            onClick={() => goTab(i)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              i === tab ? "bg-[var(--tan)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            <span aria-hidden>{lang.flag}</span> {lang.name}
          </button>
        ))}
      </div>

      {/* Card + flanking arrows */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => step(-1)}
          disabled={cards.length < 2}
          aria-label="Previous word"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-white shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 disabled:opacity-30"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          {current ? (
            <figure
              className="card p-6 sm:p-7"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              {/* Header: flag / progress dots / play-pause + waveform (sound toggle) */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl" aria-hidden>
                  {active.flag}
                </span>
                {cards.length > 1 && (
                  <div className="flex flex-1 justify-center gap-2">
                    {cards.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => goTo(i)}
                        aria-label={`Go to word ${i + 1}`}
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                          i === card ? "bg-[var(--accent)]" : "bg-[var(--tan)]"
                        }`}
                      />
                    ))}
                  </div>
                )}
                <span className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    aria-label={userPaused ? "Play" : "Pause"}
                    className="text-[var(--ink)]"
                  >
                    {userPaused ? (
                      <Play className="h-5 w-5" fill="currentColor" />
                    ) : (
                      <Pause className="h-5 w-5" fill="currentColor" />
                    )}
                  </button>
                  <button
                    onClick={toggleMuted}
                    aria-label={muted ? "Turn sound on" : "Turn sound off"}
                    aria-pressed={!muted}
                    className="text-[var(--ink)]"
                  >
                    <EqualizerIcon playing={waving} className={`h-6 w-6 ${muted ? "opacity-50" : ""}`} />
                  </button>
                </span>
              </div>

              {/* meaning = word — English first, gender marker in plain ink */}
              <p className="mt-4 text-2xl font-bold leading-tight">
                <Sweep active={isActive("english")} fill="var(--accent)" ms={PHASE_MS.english}>
                  {current.english}
                </Sweep>
                <span className="ink-soft font-semibold"> = </span>
                <Sweep active={isActive("foreign")} fill={foreignColor} ms={PHASE_MS.foreign}>
                  {current.headword}
                </Sweep>
              </p>

              {/* Trigger line */}
              <p className="mt-2 text-lg">
                <Sweep active={isActive("trigger")} fill="var(--accent)" ms={PHASE_MS.trigger} className="quote">
                  &ldquo;{current.imagine}&rdquo;
                </Sweep>
              </p>

              {/* Cartoon */}
              <div className="relative mt-4 aspect-[3/2] overflow-hidden rounded-[20px] border-2 border-[var(--ink)] bg-[var(--paper-2)]">
                <Image
                  src={current.image}
                  alt={current.alt}
                  fill
                  sizes="(max-width: 640px) 90vw, 440px"
                  className="object-contain"
                  priority
                />
              </div>

              {/* Answer bar — ghost-types the Italian, mirroring the app's test input */}
              <div
                className={`mt-4 flex items-center gap-2 rounded-[14px] border-2 bg-white px-3 py-2 transition-colors ${
                  answered ? "border-[var(--tan)]" : "border-[var(--accent)]"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center text-[15px] font-semibold">
                  {answered ? (
                    <span className="truncate text-[var(--ink)]">{current.headword}</span>
                  ) : (
                    <>
                      {typed > 0 && (
                        <span className="truncate text-[var(--ink)]">
                          {current.headword.slice(0, typed)}
                        </span>
                      )}
                      <span
                        aria-hidden
                        className="ml-px inline-block h-4 w-0.5 shrink-0 animate-pulse bg-[var(--ink)]"
                      />
                      {typed === 0 && (
                        <span className="ml-1 truncate text-[var(--mono-soft)]">Type the Italian…</span>
                      )}
                    </>
                  )}
                  {answered && (
                    <span
                      className="ml-2 whitespace-nowrap text-[13px] font-semibold"
                      style={{ color: defaultHighlightColorDark }}
                    >
                      ✅ Correct! +3 XP 🙌
                    </span>
                  )}
                </div>
                <button
                  tabIndex={-1}
                  aria-hidden
                  className="btn pointer-events-none inline-flex items-center gap-1 !px-3 !py-1.5 text-sm"
                >
                  {answered ? "Next" : "Submit"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </figure>
          ) : (
            <div className="card grid min-h-[360px] place-items-center p-6 text-center">
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
          disabled={cards.length < 2}
          aria-label="Next word"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-white shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 disabled:opacity-30"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
