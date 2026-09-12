"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CirclePause,
  CirclePlay,
  RotateCcw,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { genderColorDark, defaultHighlightColorDark } from "@/lib/design-tokens";
import type { HeroLanguageTab, HeroTriggerCard } from "./heroTriggerTypes";

/** Animated equalizer (audio-lines look) — bars pulse only while `playing`, but
 *  stay visible (static) otherwise so a paused clip still shows its wave. */
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
 * Fixed 20×20 leading slot (Figma "Audio Icon", size-5) that reserves space so the
 * text never shifts. Shows the line's emoji by default and swaps to the animated
 * audiowave while that line is the active step (the wave freezes but stays visible
 * when paused).
 */
function LeadSlot({
  emoji,
  active,
  playing,
}: {
  emoji: string;
  active: boolean;
  playing: boolean;
}) {
  return (
    <span
      className="grid size-5 shrink-0 place-items-center text-[var(--accent)]"
      aria-hidden
    >
      {active ? (
        <EqualizerIcon playing={playing} className="size-5" />
      ) : (
        <span className="text-[18px] leading-none">{emoji}</span>
      )}
    </span>
  );
}

type Phase = "english" | "foreign" | "trigger" | "answer";
const PHASE_ORDER: Phase[] = ["english", "foreign", "trigger", "answer"];

/** Fallback step durations, used when sound is off (no clip to time against). */
const PHASE_MS: Record<Phase, number> = {
  english: 1500,
  foreign: 1700,
  trigger: 3400,
  answer: 1500,
};

const TYPE_MS = 90; // per-character ghost-typing cadence
const LEADIN_MS = 1000; // pause after the bar "focuses" — cursor blinks, then types
const TAIL_MS = 250; // small beat after a clip finishes before advancing
const END_HOLD_MS = 2000; // beat on the success state before the next card

/**
 * Render the memory-trigger markup: `*english*` → italic (the target word) and
 * `{{sound-alike}}` → bold in the word's gender colour (the memory hook, matching
 * study/test mode). While the trigger clip plays, the surrounding plain text (and the
 * target word) turns brand blue; the gender-coloured hooks stay put so they pop
 * against it.
 */
function renderTrigger(
  text: string,
  { gender, playing }: { gender: string | null; playing: boolean },
) {
  // Same hex as the foreign headword's colour (the dark gender shade) so the hooks
  // and the headword read as one colour per word.
  const hookColor = (gender && genderColorDark[gender]) || defaultHighlightColorDark;
  const plainColor = playing ? "var(--accent)" : undefined;
  return text.split(/(\{\{[^}]+\}\}|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return (
        <strong key={i} className="font-bold" style={{ color: hookColor }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic" style={plainColor ? { color: plainColor } : undefined}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return (
      <span key={i} style={plainColor ? { color: plainColor } : undefined}>
        {part}
      </span>
    );
  });
}

/** The seeded audio clip for each step (the answer step is silent). */
function phaseAudio(card: HeroTriggerCard, phase: Phase): string | undefined {
  if (phase === "english") return card.audioEnglish;
  if (phase === "foreign") return card.audioForeign ?? card.audio;
  if (phase === "trigger") return card.audioTrigger;
  return undefined;
}

/**
 * Concept G hero "Word Demo Card" (from the Figma final draft). Functional
 * language tabs, an auto-playing study-flow demo (English word → foreign word →
 * memory trigger → ghost-typed answer), flanked by prev/next arrows and wrapped
 * in the two hand-drawn callout bubbles.
 *
 * Timing: each step is driven by a CSS "progress line" segment whose duration is
 * the actual clip length when sound is on (so the highlight and audio stay in
 * lockstep), falling back to PHASE_MS when muted. The step advances on the
 * segment's animationEnd, so pausing the segment (hover or the pause button)
 * freezes the whole demo — bar, audio, highlight and typing — together.
 */
export function HeroDemo({ languages }: { languages: HeroLanguageTab[] }) {
  const firstPopulated = useMemo(
    () => Math.max(0, languages.findIndex((l) => l.cards.length > 0)),
    [languages],
  );
  const [tab, setTab] = useState(firstPopulated);
  const [card, setCard] = useState(0);
  const [phase, setPhase] = useState<Phase>("english");
  const [userPaused, setUserPaused] = useState(false); // explicit play/pause
  const [reduced, setReduced] = useState(false);
  const [muted, setMuted] = useState(true); // sound off until the user opts in
  const [typed, setTyped] = useState(0); // ghost-typed characters in the answer bar
  const [runId, setRunId] = useState(0); // bumped to force a fresh demo run (card move / replay)

  const active = languages[tab];
  const cards = active.cards;
  const current = cards[card];
  const frozen = userPaused;
  const frozenRef = useRef(frozen);
  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

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
    if (!src) return;
    try {
      audioRef.current?.pause();
      const a = new Audio(src);
      audioRef.current = a;
      void a.play().catch(() => {});
    } catch {
      /* no-op: audio is best-effort */
    }
  }, []);

  // Measured clip durations (ms), keyed per tab/card/step so a step can hold
  // exactly as long as its narration. Filled lazily once sound is on; stale keys
  // from other cards simply go unread.
  const [clipMs, setClipMs] = useState<Record<string, number>>({});
  const clipKey = (p: Phase) => `${tab}-${card}-${p}`;
  useEffect(() => {
    if (muted || reduced || !current) return;
    (["english", "foreign", "trigger"] as Phase[]).forEach((p) => {
      const src = phaseAudio(current, p);
      if (!src) return;
      const key = `${tab}-${card}-${p}`;
      const probe = new Audio();
      probe.preload = "metadata";
      probe.src = src;
      probe.addEventListener("loadedmetadata", () => {
        if (!Number.isFinite(probe.duration)) return;
        setClipMs((prev) => (prev[key] ? prev : { ...prev, [key]: probe.duration * 1000 }));
      });
    });
  }, [muted, reduced, current, tab, card]);

  /** How long the current step should hold — clip length (sound on) or fallback. */
  const phaseLenMs = (p: Phase): number => {
    if (p === "answer") {
      return LEADIN_MS + (current ? current.headword.length * TYPE_MS : 0) + END_HOLD_MS;
    }
    const clip = clipMs[clipKey(p)];
    if (!muted && clip) return clip + TAIL_MS;
    return PHASE_MS[p];
  };

  // Tracks which card index has already played its "correct" chime, so the
  // feedback sound fires exactly once per answer reveal. Reset on every move.
  const chimedRef = useRef<number | null>(null);
  const goTo = useCallback((next: number) => {
    setCard(next);
    setPhase("english");
    setTyped(0);
    setRunId((n) => n + 1);
    chimedRef.current = null;
  }, []);

  /** Replay button (rotate-ccw): restart the current card's demo from the top —
   *  reset to the English step, clear the typed answer, un-pause, and bump runId so
   *  the timing driver + audio re-fire even though the card index hasn't changed. */
  const replay = () => {
    setPhase("english");
    setTyped(0);
    setUserPaused(false);
    setRunId((n) => n + 1);
    chimedRef.current = null;
  };
  const goTab = (i: number) => {
    setTab(i);
    goTo(0);
  };
  const step = (dir: 1 | -1) => {
    if (cards.length === 0) return;
    goTo((card + dir + cards.length) % cards.length);
  };

  /** Advance to the next step, or roll to the next card after the answer. */
  const advance = () => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx === PHASE_ORDER.length - 1) goTo((card + 1) % cards.length);
    else setPhase(PHASE_ORDER[idx + 1]);
  };

  const togglePlay = () => {
    const next = !userPaused;
    setUserPaused(next);
    if (next) audioRef.current?.pause();
  };

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    if (next) audioRef.current?.pause();
  };

  // Start the current step's clip when the step (or card) changes — but not on a
  // pause/resume (those are handled below so the same element resumes in place).
  useEffect(() => {
    if (reduced || muted || !current || frozenRef.current) return;
    playClip(phaseAudio(current, phase));
  }, [reduced, muted, current, phase, playClip, runId]);

  // Freeze/resume audio with the rest of the demo, in place (no restart).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (frozen) a.pause();
    else if (!muted && !reduced) void a.play().catch(() => {});
  }, [frozen, muted, reduced]);

  // Ghost-type the headword during the answer step, after a short lead-in beat so
  // the bar reads as "clicked" (cursor blinks) before typing. Pauses when frozen.
  useEffect(() => {
    if (reduced || frozen || !current) return;
    if (phase !== "answer" || typed >= current.headword.length) return;
    const delay = typed === 0 ? LEADIN_MS : TYPE_MS;
    const id = setTimeout(() => setTyped((t) => t + 1), delay);
    return () => clearTimeout(id);
  }, [reduced, frozen, current, phase, typed]);

  // Play the "correct" feedback chime once the answer finishes ghost-typing,
  // in sync with the input-bar success state. Gated on sound being on.
  useEffect(() => {
    if (reduced || muted || !current) return;
    if (phase !== "answer" || typed < current.headword.length) return;
    if (chimedRef.current === card) return;
    chimedRef.current = card;
    try {
      void new Audio("/sounds/correct.mp3").play().catch(() => {});
    } catch {
      /* no-op: sfx is best-effort */
    }
  }, [reduced, muted, current, phase, typed, card]);

  const isActive = (p: Phase) => !reduced && phase === p;
  // The memory trigger highlights (text darkens to the word's gender shade, like
  // the real study/test app) only while its own clip is the active step; the
  // leading audiowave turns blue with it and animates unless the demo is frozen.
  const triggerActive = isActive("trigger");
  const inAnswer = reduced || phase === "answer";
  const answered = reduced || (!!current && typed >= current.headword.length);
  const foreignColor = current
    ? (current.gender && genderColorDark[current.gender]) || defaultHighlightColorDark
    : defaultHighlightColorDark;

  return (
    <div className="w-full">
      {/* Language tabs */}
      <div
        className="mb-5 flex flex-wrap justify-center gap-3"
        role="tablist"
        aria-label="Language"
      >
        {languages.map((lang, i) => (
          <button
            key={lang.slug}
            role="tab"
            aria-selected={i === tab}
            onClick={() => goTab(i)}
            className={`label-heavy rounded-full px-3 py-2 transition-colors ${
              i === tab
                ? "bg-[var(--tan)] text-black"
                : "text-black/[0.67] hover:text-black"
            }`}
          >
            <span aria-hidden>{lang.flag}</span> {lang.name}
          </button>
        ))}
      </div>

      {/* Card + flanking arrows */}
      <div className="relative">
        {/* Callout bubbles — the two hand annotations, anchored to the arrows+card
            row (not the card alone), so the prev/next arrows are part of their
            reference frame. Each is absolutely positioned by its Figma AABB centre
            (the rotation pivot), expressed relative to the row's top-left, then
            rotated about that centre — matching the Figma "Callout Comment"
            instances 1:1. The card sits 52px into the row (40px arrow + 12px gap),
            so the card-relative centres shift +52px in x. lg-only, decorative.

            "How it works" (top-left): row-relative centre (-16.45, 29.96); group
            tilted -17.88°; upright (0°) text above the arrow, which is rotated
            57.42° inside its fixed 58.492×65.888 box. */}
        <div className="pointer-events-none absolute left-[-16.45px] top-[29.96px] z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          <div className="flex rotate-[-17.88deg] flex-col items-center gap-2">
            <span className="callout whitespace-nowrap text-center">How it works</span>
            <div className="flex h-[65.888px] w-[58.492px] items-center justify-center">
              <div className="rotate-[57.42deg]">
                <Image
                  src="/marketing/g/callout-arrow-1.svg"
                  alt=""
                  width={57}
                  height={33}
                  className="block h-[32.874px] w-[57.184px] max-w-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* "Warning" (bottom-left): row-relative centre (-1.70, 481.38); group
            tilted +8.7°; the arrow sits above the text, vertically flipped
            (scaleY -1) and rotated -57.42° inside its fixed 58.492×65.888 box, with
            the upright (0°) text (capped to 160px so it wraps to two lines) below. */}
        <div className="pointer-events-none absolute left-[-1.70px] top-[481.38px] z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          <div className="flex rotate-[8.7deg] flex-col items-center gap-2">
            <div className="flex h-[65.888px] w-[58.492px] items-center justify-center">
              <div className="-scale-y-100 rotate-[-57.42deg]">
                <Image
                  src="/marketing/g/callout-arrow-2.svg"
                  alt=""
                  width={57}
                  height={33}
                  className="block h-[32.874px] w-[57.184px] max-w-none"
                />
              </div>
            </div>
            <span className="callout max-w-[160px] text-center">
              Warning: Sense of humour required
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => step(-1)}
            disabled={cards.length < 2}
            aria-label="Previous word"
            className="arrow grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="relative min-w-0 flex-1">
            {current ? (
              <figure key={`${tab}-${card}`} className="card card-deal relative p-6">
                {/* Word — English meaning above the foreign headword, each on its own
                    line with a leading 20×20 slot (the line's flag, which swaps to the
                    animated audiowave while that line plays), gap 12px. Text is
                    Heading/S (Bricolage 24px); English highlights accent-blue in its
                    phase, the headword its gender colour. The foreign row trails a muted
                    "(which sounds like …)" pronunciation hint. The pause / replay / mute
                    controls ride the top-right of the English row. */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <LeadSlot
                        emoji="🇬🇧"
                        active={isActive("english")}
                        playing={isActive("english") && !frozen}
                      />
                      <p
                        className="heading-s truncate text-[var(--ink)]"
                        style={isActive("english") ? { color: "var(--accent)" } : undefined}
                      >
                        {current.english}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-4 text-[var(--ink)]">
                      <button onClick={togglePlay} aria-label={userPaused ? "Play" : "Pause"}>
                        {userPaused ? (
                          <CirclePlay className="h-6 w-6" />
                        ) : (
                          <CirclePause className="h-6 w-6" />
                        )}
                      </button>
                      <button onClick={replay} aria-label="Replay from the start">
                        <RotateCcw className="h-6 w-6" />
                      </button>
                      <button
                        onClick={toggleMuted}
                        aria-label={muted ? "Turn sound on" : "Turn sound off"}
                        aria-pressed={!muted}
                      >
                        {muted ? (
                          <VolumeOff className="h-6 w-6" />
                        ) : (
                          <Volume2 className="h-6 w-6" />
                        )}
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <LeadSlot
                      emoji={active.flag}
                      active={isActive("foreign")}
                      playing={isActive("foreign") && !frozen}
                    />
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <p
                        className="heading-s"
                        style={{ color: isActive("foreign") ? "var(--accent)" : foreignColor }}
                      >
                        {current.headword}
                      </p>
                      <span className="text-[14px] font-medium leading-[1.5] tracking-[-0.01em] text-[var(--ink)]/[0.67]">
                        (which sounds like {current.soundsLike})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Memory trigger — a full-bleed rounded cartoon (aspect ≈ 339:240) with
                    the trigger text sitting directly on the card below it (no recessed
                    tile). The trigger renders *english* italic and {{sound-alike}} bold in
                    the word's gender colour (like study/test mode); while the clip plays
                    the surrounding plain text turns brand blue so the gender-coloured hooks
                    pop against it (20px). A leading audiowave sits in a fixed slot to the
                    left of the trigger — light grey at rest, turning blue and animating
                    while the trigger plays. The "So imagine…" lead-in stays
                    muted grey. A min-height on the trigger reserves two lines so the
                    card — and the whole hero — keeps a constant height across cards.
                    Missing art falls back to a "Cartoon coming soon" placeholder. */}
                <div className="mt-4">
                  {current.image ? (
                    <div className="relative aspect-[339/240] w-full overflow-hidden rounded-[20px]">
                      <Image
                        src={current.image}
                        alt={current.alt}
                        fill
                        sizes="(max-width: 640px) 90vw, 390px"
                        className="object-cover"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="grid aspect-[339/240] w-full place-items-center rounded-[20px] bg-[#fbf9f5] px-6 text-center">
                      <p className="text-[13px] font-medium text-[var(--mono-soft)]">
                        Cartoon coming soon
                      </p>
                    </div>
                  )}
                  <div className="mt-5 grid grid-cols-[auto_1fr] items-start gap-x-3">
                    <p className="col-start-2 row-start-1 text-[13px] font-medium leading-[1.5] tracking-[-0.01em] text-[var(--ink)]/[0.67]">
                      So imagine…
                    </p>
                    <span
                      className="col-start-1 row-start-2 mt-1 grid size-5 shrink-0 place-items-center transition-colors"
                      style={{ color: triggerActive ? "var(--accent)" : "#c9c7c5" }}
                      aria-hidden
                    >
                      <EqualizerIcon playing={triggerActive && !frozen} className="size-5" />
                    </span>
                    <p className="col-start-2 row-start-2 mt-1 min-h-[54px] text-[20px] font-medium leading-[1.35] tracking-[-0.01em] text-[var(--ink)]">
                      {renderTrigger(current.imagine, {
                        gender: current.gender,
                        playing: triggerActive,
                      })}
                    </p>
                  </div>
                </div>

                {/* Answer bar — stays neutral until the trigger has played, then the
                    border turns blue (as if clicked), the caret blinks through the
                    lead-in, and the headword ghost-types in (Label/Medium Large:
                    Inter Medium 18px). The border stays blue once answered; the
                    correct feedback sits in the trailing slot. */}
                <div
                  className={`mt-5 flex items-center justify-between gap-3 overflow-hidden rounded-[16px] border-2 bg-white px-4 py-[10px] transition-colors ${
                    inAnswer ? "border-[var(--accent)]" : "border-[var(--ink)]"
                  }`}
                >
                  <div className="label-lg flex min-h-[26px] min-w-0 flex-1 items-center">
                    {answered ? (
                      <span className="truncate text-[var(--ink)]">{current.headword}</span>
                    ) : inAnswer ? (
                      <>
                        {typed > 0 && (
                          <span className="truncate text-[var(--ink)]">
                            {current.headword.slice(0, typed)}
                          </span>
                        )}
                        <span
                          aria-hidden
                          className="ml-px inline-block h-5 w-0.5 shrink-0 animate-pulse bg-[var(--ink)]"
                        />
                      </>
                    ) : (
                      <span className="truncate text-[var(--mono-soft)]">
                        Type the {active.name}…
                      </span>
                    )}
                  </div>
                  {answered && (
                    <span
                      className="shrink-0 whitespace-nowrap text-[14px] font-semibold"
                      style={{ color: defaultHighlightColorDark }}
                    >
                      ✅ Correct! 🙌
                    </span>
                  )}
                </div>
              </figure>
            ) : (
              <div className="card grid min-h-[360px] place-items-center p-6 text-center">
                <div>
                  <p className="text-4xl" aria-hidden>
                    {active.flag}
                  </p>
                  <p className="mt-3 text-lg font-bold">{active.name} triggers coming soon</p>
                  <p className="mt-1 text-[14px] text-[var(--mono-soft)]">
                    The cartoons are on their way. Peek at the Italian ones in the meantime.
                  </p>
                </div>
              </div>
            )}

            {/* Progress dots — round carousel dots below and outside the card:
                active dot accent-blue, the rest tan; each is a clickable jump
                target. The auto-play timing lives in a separate hidden driver
                (below) so the dots stay simple. */}
            {current && cards.length > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
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

            {/* Timing driver — invisible. The active phase's fill sweeps over its
                real duration and advances the demo on completion (onAnimationEnd).
                Re-mounts each phase (keyed) so a fresh sweep fires every step; kept
                out of flow so it drives auto-play without rendering anything. */}
            {current && !reduced && (
              <span
                key={`${tab}-${card}-${phase}-${runId}`}
                aria-hidden
                className="progress-fill pointer-events-none absolute h-0 w-0 opacity-0"
                style={{
                  ["--fill-ms" as string]: `${phaseLenMs(phase)}ms`,
                  animationPlayState: frozen ? "paused" : "running",
                }}
                onAnimationEnd={advance}
              />
            )}
          </div>

          <button
            onClick={() => step(1)}
            disabled={cards.length < 2}
            aria-label="Next word"
            className="arrow grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-white"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
