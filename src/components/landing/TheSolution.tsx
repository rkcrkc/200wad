import Link from "next/link";
import Image from "next/image";
import { SolutionCarousel } from "./SolutionCarousel";
import { appUrl } from "@/lib/host";
import { SOLUTION_CARDS } from "./solutionCardsData";
import { CalloutAnnotation } from "./CalloutAnnotation";

/** The three-step promise above the carousel. Regular-case source; the label is
 *  Inter Medium, the number pill sits on a soft tan-paper fill. */
const STEPS = [
  { n: "1", label: "See it" },
  { n: "2", label: "Hear it" },
  { n: "3", label: "Type it" },
];

/**
 * Section 5 · The Solution — the "now learning vocab couldn't be easier" pitch: a
 * centred header + parenthetical sub-heading, a 1-2-3 step promise, then a
 * swipeable carousel of real word cards the visitor can actually try (type the
 * foreign word, get correct / try-again feedback), closing on a CTA + reassurance
 * caption. Decorative callout annotations + the testimonial callout land in a
 * later pass.
 */
export function TheSolution() {
  return (
    <section aria-label="How 200 Words a Day works" className="relative overflow-hidden bg-[#fffdf7] py-20 sm:py-24">
      {/* Wavy divider — the tail-end of the tan Problem section dipping into this
          cream one, so the colour break reads as a hand-drawn wave rather than a
          ruled line. Decorative; full-bleed and stretched (preserveAspectRatio
          none) so it spans any width. */}
      <svg
        aria-hidden
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 h-6 w-full sm:h-10"
      >
        <path
          d="M0,20 C120,40 240,40 360,20 C480,0 600,0 720,20 C840,40 960,40 1080,20 C1200,0 1320,0 1440,20 L1440,0 L0,0 Z"
          fill="var(--paper)"
        />
      </svg>

      {/* Header — eyebrow, heading (with highlight), sub-heading. */}
      <div className="container flex flex-col items-center gap-3 text-center">
        <p className="eyebrow">That&rsquo;s why we created 200 Words a Day</p>
        <h2 className="heading-xl max-w-[600px] text-[var(--ink)]">
          Now learning vocab couldn&rsquo;t be <span className="mark">easier</span>
        </h2>
        <p className="heading-m">(or more of a laugh)</p>
      </div>

      {/* Steps — 1 See it → 2 Hear it → 3 Type it. Figma pills: flat --paper fill
          (reads against the page's dotted field), ink number + label (no accent),
          → separators in ink. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-6">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-3">
            <span className="flex items-center gap-3 rounded-full bg-[var(--paper)] px-4 py-2 text-[16px] font-medium tracking-[-0.01em] text-[var(--ink)]">
              <span>{s.n}</span>
              <span>{s.label}</span>
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--ink)]" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Carousel — swipeable deck of typable word cards (full-bleed so cards can
          scroll edge-to-edge; the shared container gutters live inside it). The
          two hand-drawn callout annotations flank its lower corners; they're
          pointer-events-none so they never block a swipe, and hidden below xl
          where the margins are too tight to hold them without crowding. */}
      <div className="relative mt-12">
        <div className="pointer-events-none absolute -bottom-2 left-6 z-10 hidden xl:block">
          <CalloutAnnotation
            text="The wacky cartoon & memory hook stick in your brain long after learning"
            wrapRotate="rotate-[-9.93deg]"
            arrowClass="-scale-y-100 rotate-[-57.42deg]"
            widthClass="w-[194px]"
          />
        </div>
        <div className="pointer-events-none absolute -bottom-2 right-6 z-10 hidden xl:block">
          <CalloutAnnotation
            text="Works even if you are the forgetful type"
            wrapRotate="rotate-[19.83deg]"
            arrowClass="rotate-[-122.58deg]"
            widthClass="w-[160px]"
          />
        </div>
        <SolutionCarousel cards={SOLUTION_CARDS} />
      </div>

      {/* CTA + reassurance caption. */}
      <div className="mt-12 flex flex-col items-center gap-4 px-6 text-center">
        <Link href={appUrl("/signup")} className="btn big">
          🇫🇷&nbsp;&nbsp;Start now &ndash; it&rsquo;s free
        </Link>
        <p className="eyebrow sm">10 lessons free per language · No credit card needed</p>
      </div>

      {/* Testimonial callout — a single centred learner quote (Inter Medium 24) over
          a 32px avatar + uppercase mono name, sitting under the CTA with generous top
          space (Figma pt-[90px]). */}
      <figure className="mx-auto mt-[90px] flex w-full max-w-[556px] flex-col items-center gap-6 px-6 text-center">
        <blockquote className="text-[24px] font-medium leading-[1.35] tracking-[-0.01em] text-[var(--ink)]">
          &ldquo;Thanks for the many laughs, and thanks for making German so much
          easier!&rdquo;
        </blockquote>
        <figcaption className="flex items-center justify-center gap-2">
          <Image
            src="/marketing/g/avatar.svg"
            alt=""
            width={32}
            height={32}
            className="shrink-0"
          />
          <span className="eyebrow">NITA Christopher</span>
        </figcaption>
      </figure>
    </section>
  );
}
