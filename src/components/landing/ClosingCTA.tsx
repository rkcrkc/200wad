import Link from "next/link";
import { appUrl } from "@/lib/host";

/** The scattered "Word Card Simple" cards fanned under the closing headline. Every
 *  card is the same 120.6px base size, rotated about its centre — the Figma frames'
 *  differing bounding boxes are purely the effect of that rotation. `cx`/`cy` are
 *  each card's centre on the 721×188 visual canvas, `rot` its tilt (the fan
 *  alternates CCW/CW), and `z` the Figma stacking order. Content is illustrative
 *  French vocab — the cards are decorative, so the block is aria-hidden. */
const CTA_CARDS = [
  { cx: 70.72, cy: 101.98, rot: -8.1, z: 2, headword: "ronfler", gloss: "to snore" },
  { cx: 180.21, cy: 95.65, rot: 10.2, z: 5, headword: "vélo", gloss: "bicycle" },
  { cx: 300.71, cy: 91.51, rot: -9.2, z: 6, headword: "chapeau", gloss: "hat" },
  { cx: 410.31, cy: 93.51, rot: 12.8, z: 4, headword: "assiette", gloss: "plate" },
  { cx: 534.19, cy: 85.97, rot: -8.1, z: 1, headword: "policier", gloss: "policeman" },
  { cx: 652.19, cy: 100.81, rot: 6.4, z: 3, headword: "dormir", gloss: "to sleep" },
] as const;

/** One "Word Card Simple": white card, grey image placeholder, ink headword over a
 *  muted gloss (Bricolage Bold). Rendered at the 120.6px base size; callers rotate it. */
function WordCardSimple({ headword, gloss }: { headword: string; gloss: string }) {
  return (
    <div className="flex w-[120.6px] flex-col items-center gap-[4px] rounded-[10px] border-2 border-[var(--ink)] bg-white p-[8px] shadow-[3px_3px_0_var(--ink)]">
      <div className="h-[100.5px] w-full rounded-[4px] bg-[#fbf9f5]" />
      <div className="w-full text-center font-[family-name:var(--font-bricolage)] text-[14px] font-bold leading-[1.3] tracking-[-0.14px]">
        <p className="w-full text-[var(--ink)]">{headword}</p>
        <p className="w-full text-[var(--mono-soft)]">{gloss}</p>
      </div>
    </div>
  );
}

/**
 * Section 11 · Closing CTA — a centred sign-off: eyebrow, big headline, a fanned
 * row of decorative word cards, and the primary "Start now" button. The fan is a
 * fixed 721×188 canvas of absolutely-placed cards, scaled down (and its wrapper
 * height matched) at each breakpoint so it never overflows on narrow screens.
 */
export function ClosingCTA() {
  return (
    <section aria-label="Get started" className="bg-[#fffdf7] px-6 pb-24 pt-16 sm:pb-32 sm:pt-20">
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-[30px] text-center">
        <p className="eyebrow">Now it&rsquo;s your turn</p>

        <h2 className="heading-xl max-w-[484px] text-[var(--ink)]">
          Build a vocabulary of thousands of words, faster than ever!
        </h2>

        {/* Decorative fan — clipped + scaled per breakpoint. The canvas is taller
            than the 188px Figma frame so the rotated cards' bottoms (and their 3px
            shadow) aren't clipped; wrapper heights track the scaled canvas. */}
        <div
          aria-hidden
          className="flex h-[88px] w-full items-center justify-center overflow-hidden sm:h-[126px] md:h-[179px] lg:h-[210px]"
        >
          <div className="relative h-[210px] w-[721px] shrink-0 origin-center scale-[0.42] sm:scale-[0.6] md:scale-[0.85] lg:scale-100">
            {CTA_CARDS.map((c) => (
              <div
                key={c.headword}
                className="absolute"
                style={{
                  left: c.cx,
                  top: c.cy,
                  zIndex: c.z,
                  transform: `translate(-50%, -50%) rotate(${c.rot}deg)`,
                }}
              >
                <WordCardSimple headword={c.headword} gloss={c.gloss} />
              </div>
            ))}
          </div>
        </div>

        <Link href={appUrl("/signup")} className="btn big">
          Start now &ndash; it&rsquo;s free
        </Link>
      </div>
    </section>
  );
}
