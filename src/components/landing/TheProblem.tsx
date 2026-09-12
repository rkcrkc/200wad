import Image from "next/image";

/** Scattered emoji reactions ringing the header (desktop only). Positions/rotations
 *  are the exact Figma coords on the 1440×670 section canvas; `left` is the emoji's
 *  centre-x (paired with -translate-x-1/2). Purely decorative. */
const EMOJI = [
  { char: "😵‍💫", left: 313.57, top: 295, w: 69.143, h: 69.143, rot: 9.57 },
  { char: "🤷‍♀️", left: 526.01, top: 114, w: 74.011, h: 74.011, rot: -15.72 },
  { char: "🙈", left: 1159.89, top: 315, w: 67.788, h: 67.788, rot: 8.02 },
  { char: "⁉️", left: 981.87, top: 485, w: 81.73, h: 89.73, rot: -27.68 },
];

/** Overheard-learner speech snippets — rotated, half-opacity. `left` is the box's
 *  left edge (no centring translate), matching the Figma caption frames. */
const CAPTIONS = [
  { text: "“....Um”", left: 894.78, top: 121.86, w: 97.545, h: 62.897 },
  { text: "“How do you say...”", left: 439, top: 489, w: 173.853, h: 83.343 },
];

/**
 * Section 4 · The Problem — a centred headline + supporting paragraph making the
 * "your vocab is holding you back" pitch, floating over a soft tan brush-stroke and
 * ringed by scattered emoji / overheard-phrase annotations. The brush and annotation
 * layer are decorative (aria-hidden); the annotations are pinned to the exact
 * 1440×670 Figma canvas and only show at lg+, where overflow-clipping keeps them
 * anchored to the centred header. Below lg the section collapses to just the header.
 */
export function TheProblem() {
  return (
    <section
      aria-label="Why vocabulary matters"
      className="relative flex items-center justify-center overflow-hidden bg-[var(--paper)] px-6 py-20 sm:py-24 lg:min-h-[670px] lg:py-0"
    >
      {/* Soft brush-stroke behind the header — centred at its natural leaf size. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <Image
          src="/marketing/g/problem-scribble.svg"
          alt=""
          width={848}
          height={460}
          className="max-w-none"
        />
      </div>

      {/* Annotation layer — pinned to the 1440×670 Figma canvas, desktop only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[670px] w-[1440px] -translate-x-1/2 -translate-y-1/2 lg:block"
      >
        {EMOJI.map((e) => (
          <div
            key={e.char}
            className="absolute flex -translate-x-1/2 items-center justify-center"
            style={{
              left: `${e.left}px`,
              top: `${e.top}px`,
              width: `${e.w}px`,
              height: `${e.h}px`,
            }}
          >
            <span className="text-[60px] leading-none" style={{ transform: `rotate(${e.rot}deg)` }}>
              {e.char}
            </span>
          </div>
        ))}
        {CAPTIONS.map((c) => (
          <div
            key={c.text}
            className="absolute flex items-center justify-center"
            style={{
              left: `${c.left}px`,
              top: `${c.top}px`,
              width: `${c.w}px`,
              height: `${c.h}px`,
            }}
          >
            <p
              className="label-heavy whitespace-nowrap text-center text-[var(--ink)] opacity-50"
              style={{ transform: "rotate(15deg)" }}
            >
              {c.text}
            </p>
          </div>
        ))}
      </div>

      {/* Header — the semantic content. */}
      <div className="relative flex max-w-[600px] flex-col items-center gap-4 text-center">
        <h2 className="heading-xl max-w-[540px] text-[var(--ink)]">
          Your <span className="mark">lack of vocab</span> is holding you back
        </h2>
        <p className="body text-[var(--ink-soft)]">
          Vocab is the backbone of actually speaking a language &ndash; because what good is
          grammar if you&rsquo;ve got no words to put in the sentence. The only problem is,
          learning vocab is so boring &amp; tedious&hellip; until now!
        </p>
      </div>
    </section>
  );
}
