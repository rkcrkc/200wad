import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { appUrl } from "@/lib/host";
import { CalloutAnnotation } from "./CalloutAnnotation";

/* ── Block A · Curriculum ──────────────────────────────────────────────────── */

/** Scattered "topic collage" word cards. Coords/rotations are the exact Figma
 *  values on the 592×418 collage canvas; each entry is the rotated bounding box
 *  (the card itself is a fixed 120.6px wide and sits centred + tilted inside it).
 *  The first card is un-rotated and placed directly (no bounding box). */
const CURRICULUM_CARDS = [
  { label: "policeman", left: 143, top: 2, w: 0, h: 0, rot: 0, radius: 10 },
  { label: "plate", left: 364.89, top: 2.55, w: 145.739, h: 159.263, rot: -11.53, radius: 10 },
  { label: "to snore", left: 7, top: 26, w: 152.192, h: 164.453, rot: -15, radius: 10 },
  { label: "bicycle", left: 252.99, top: 24.12, w: 139.645, h: 154.235, rot: 8.49, radius: 10 },
  { label: "hat", left: 270, top: 175, w: 133.057, h: 148.687, rot: 5.41, radius: 10 },
  { label: "to sleep", left: 365, top: 162, w: 161.588, h: 171.675, rot: -20.71, radius: 10 },
  { label: "policeman", left: 156, top: 189, w: 138.628, h: 153.386, rot: -8, radius: 10 },
  { label: "to snore", left: 37, top: 183, w: 135.044, h: 150.371, rot: 6.32, radius: 12 },
] as const;

/** Topic tags ringing the collage (yellow Figma badges). `right` is used instead
 *  of `left` for the one anchored to the canvas' right edge. */
const CURRICULUM_TOPICS = [
  { label: "🕰️  Numbers & Time", left: 31, top: 30.98 },
  { label: "📚  Work & School", left: 422, top: 43 },
  { label: "🍝  Food & Drink", left: 114, top: 153.98 },
  { label: "🧳  Travel & Directions", left: 310, top: 215.98 },
  { label: "🛍️  Shopping & Money", left: -29, top: 257.98 },
  { label: "🏃‍♂️  Verbs", right: 10, top: 341.98 },
  { label: "👨‍👩‍👧  Family & People", left: 139, top: 344.98 },
] as const;

/** One tilted word card in the topic collage: white card, grey image placeholder,
 *  muted headword. Decorative — the real content lives in the adjacent copy. */
function CollageCard({ label, radius }: { label: string; radius: number }) {
  return (
    <div
      className="flex w-[120.6px] flex-col items-center gap-[5.36px] border-2 border-[var(--ink)] bg-white p-[8.04px] shadow-[3px_3px_0_var(--ink)]"
      style={{ borderRadius: radius }}
    >
      <div className="h-[100.5px] w-full rounded-[4.02px] bg-[#fbf9f5]" />
      <p className="w-full text-center font-[family-name:var(--font-bricolage)] text-[13px] font-semibold tracking-[-0.195px] text-[rgba(25,21,16,0.67)]">
        {label}
      </p>
    </div>
  );
}

function CurriculumCollage() {
  return (
    <div
      aria-hidden
      className="relative h-[418px] w-[592px] shrink-0 origin-center scale-[0.5] sm:scale-[0.72] md:scale-90 lg:scale-100"
    >
      {CURRICULUM_CARDS.map((c, i) =>
        c.rot === 0 ? (
          <div key={i} className="absolute" style={{ left: c.left, top: c.top }}>
            <CollageCard label={c.label} radius={c.radius} />
          </div>
        ) : (
          <div
            key={i}
            className="absolute flex items-center justify-center"
            style={{ left: c.left, top: c.top, width: c.w, height: c.h }}
          >
            <div className="flex-none" style={{ transform: `rotate(${c.rot}deg)` }}>
              <CollageCard label={c.label} radius={c.radius} />
            </div>
          </div>
        ),
      )}
      {CURRICULUM_TOPICS.map((t) => (
        <span
          key={t.label}
          className="absolute inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[var(--marker)] px-3.5 py-1.5 text-[14px] font-semibold tracking-[-0.21px] text-[var(--ink)]"
          style={{ top: t.top, left: "left" in t ? t.left : undefined, right: "right" in t ? t.right : undefined }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

function BlockCurriculum() {
  return (
    <div className="container grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-2 lg:gap-14 lg:py-24">
      <div className="flex h-[209px] items-center justify-center overflow-hidden sm:h-[301px] md:h-[376px] lg:h-[418px]">
        <CurriculumCollage />
      </div>
      <div className="flex flex-col items-start">
        <h2 className="heading-xl max-w-[553px] text-[var(--ink)]">
          Thousands of words across lots of topics
        </h2>
        <p className="body mt-6 text-[var(--ink-soft)]">
          Thousands of words per language covering important, everyday topics for learners of all
          levels. Quickly build a big vocabulary of words to help you on your way to fluency.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {["Beginner", "Intermediate", "Advanced"].map((level) => (
            <span key={level} className="pill text-[14px]">
              <Check className="h-4 w-4 text-[var(--success)]" strokeWidth={3} />
              {level}
            </span>
          ))}
        </div>
        <Link href={appUrl("/signup")} className="btn big mt-8">
          Start now &ndash; it&rsquo;s free
        </Link>
      </div>
    </div>
  );
}

/* ── Block B · Testing ─────────────────────────────────────────────────────── */

/** The "progress-showcase" mock UI: a vocab-growth line chart, a word-mastered
 *  toast and a live test row — the in-product proof for the testing pitch. */
function ProgressShowcase() {
  return (
    <div className="flex w-full flex-col gap-4 rounded-[14px] border-[2.5px] border-[var(--ink)] bg-[#fffdf7] p-6 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex items-center justify-between">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.06em] text-[var(--ink-soft)]">
          YOUR VOCABULARY
        </p>
        <div className="rounded-[22px] border-2 border-[var(--ink)] bg-[var(--marker)] px-3 py-1 shadow-[3px_3px_0_var(--ink)]">
          <p className="text-[13px] font-semibold text-[var(--ink)]">1,240 words</p>
        </div>
      </div>

      {/* Vocab chart — area fill behind, curve on top, endpoint dot. Insets are the
          Figma percentages against the 472×120 chart box. */}
      <div className="relative h-[120px] w-full overflow-hidden">
        <div className="absolute inset-[8.33%_10.53%_3.33%_10.53%]">
          <div className="absolute inset-[-1.42%_-0.4%]">
            <Image
              src="/marketing/g/features/chart-area.svg"
              alt=""
              fill
              sizes="380px"
              className="object-fill"
            />
          </div>
        </div>
        <div className="absolute inset-[8.33%_10.53%_0%_10.53%]">
          <Image
            src="/marketing/g/features/chart-line.svg"
            alt=""
            fill
            sizes="380px"
            className="object-fill"
          />
        </div>
        <div className="absolute inset-[4.17%_9.21%_87.5%_88.16%]">
          <div className="absolute inset-[-10%_-8.05%]">
            <Image
              src="/marketing/g/features/chart-dot.svg"
              alt=""
              fill
              sizes="20px"
              className="object-fill"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-[10px] border-2 border-[var(--ink)] bg-[#ffeaf3] px-4 py-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-[20px] border-2 border-[var(--ink)] bg-[var(--marker)] text-[16px]">
          🏆
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[15px] font-bold text-[var(--ink)]">Word mastered! 🎉</p>
          <p className="text-[13px] text-[var(--ink-soft)]">Correct 3 times in a row · +30 XP</p>
        </div>
      </div>

      <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.06em] text-[var(--ink-soft)]">
        TEST YOURSELF
      </p>
      <div className="flex items-center justify-between rounded-[10px] border-2 border-[var(--accent)] bg-white px-4 py-3">
        <p className="font-[family-name:var(--font-mono)] text-[18px] font-bold text-[var(--ink)]">
          fragola
        </p>
        <p className="text-[14px] font-bold text-[var(--accent)]">✓ Correct! +3 XP</p>
      </div>
    </div>
  );
}

function BlockTesting() {
  return (
    <div className="container py-8 lg:py-12">
      <div className="relative">
        <div className="grid grid-cols-1 items-center gap-12 rounded-[40px] bg-white px-6 py-10 sm:px-12 lg:grid-cols-2 lg:gap-20 lg:px-[60px] lg:py-[50px]">
          <div className="flex flex-col items-start">
            <h2 className="heading-xl max-w-[520px] text-[var(--ink)]">
              5 minute lessons &amp; in-built testing makes progression easy
            </h2>
            <p className="body mt-3.5 text-[var(--ink-soft)]">
              The in-built testing system makes it easy to stay on track and progress through the
              lessons.
            </p>
            <Link href={appUrl("/signup")} className="btn big mt-6">
              Start now &ndash; it&rsquo;s free
            </Link>
          </div>
          <div className="w-full">
            <ProgressShowcase />
          </div>
        </div>

        {/* "Watch your vocabulary grow" — pinned to the card's lower-right, desktop
            only (no room in the margins below xl). */}
        <div className="pointer-events-none absolute -bottom-6 right-2 z-10 hidden xl:block">
          <CalloutAnnotation
            text="Watch your vocabulary grow"
            wrapRotate="rotate-[-13.71deg]"
            arrowClass="rotate-[-122.58deg]"
            widthClass="w-[124px]"
          />
        </div>
      </div>
    </div>
  );
}

/* ── Block C · Complementary tools ─────────────────────────────────────────── */

/** Competitor / companion study-tool logos, scattered around the central 200WAD
 *  mark. Sizes/positions are the Figma coords on the 580×400 visual canvas. */
const TOOL_IMAGES = [
  { key: "1263", src: "tool-1263.png", left: 28, top: 128.98, w: 54, h: 54 },
  { key: "1265", src: "tool-1265.png", left: 231, top: 16.98, w: 79, h: 27 },
  { key: "1268", src: "tool-1268.png", left: 437, top: 130.98, w: 73, h: 51 },
  { key: "1264", src: "tool-1264.png", left: 370, top: 286.98, w: 86, h: 52 },
  { key: "1267", src: "tool-1267.png", left: 84, top: 297.98, w: 86, h: 37 },
] as const;

/** White capability tags around the tools collage. */
const TOOL_BADGES = [
  { label: "🎞️  TV & Movies", left: 337, top: 59.98 },
  { label: "🧑‍🏫  Classroom", left: 85, top: 65.98 },
  { label: "🎧  Audio courses", left: 401, top: 221.98 },
  { label: "📚  Textbooks", left: 28, top: 223.98 },
  { label: "🗣️  Language Exchange", left: 182, top: 342.98 },
] as const;

function ToolsCollage() {
  return (
    <div
      aria-hidden
      className="relative h-[400px] w-[580px] shrink-0 origin-center scale-[0.5] sm:scale-[0.72] md:scale-90 lg:scale-100"
    >
      {/* Soft tan blob + 200WAD logo at the centre. */}
      <div className="absolute" style={{ left: 198, top: 139.98, width: 132, height: 117 }}>
        <div className="absolute inset-[-21.37%_-18.94%]">
          <Image
            src="/marketing/g/features/tools-center-shape.svg"
            alt=""
            fill
            sizes="182px"
            className="object-contain"
          />
        </div>
      </div>
      <div className="absolute" style={{ left: 219, top: 173.48, width: 86.745, height: 48 }}>
        <Image
          src="/marketing/g/features/tools-logo.svg"
          alt=""
          fill
          sizes="87px"
          className="object-contain"
        />
      </div>

      {TOOL_IMAGES.map((t) => (
        <div key={t.key} className="absolute" style={{ left: t.left, top: t.top, width: t.w, height: t.h }}>
          <Image
            src={`/marketing/g/features/${t.src}`}
            alt=""
            fill
            sizes={`${t.w}px`}
            className="object-contain"
          />
        </div>
      ))}

      {TOOL_BADGES.map((b) => (
        <span
          key={b.label}
          className="absolute inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#fffdf7] px-3.5 py-2 text-[14px] font-semibold tracking-[-0.21px] text-[var(--ink)]"
          style={{ left: b.left, top: b.top }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

function BlockTools() {
  return (
    <div className="container py-16 lg:py-24">
      <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="flex h-[200px] items-center justify-center overflow-hidden sm:h-[288px] md:h-[360px] lg:h-[400px]">
          <ToolsCollage />
        </div>
        <div className="flex flex-col items-start">
          <h2 className="heading-xl max-w-[520px] text-[var(--ink)]">
            Works well alongside other study tools
          </h2>
          <p className="body mt-3.5 text-[var(--ink-soft)]">
            With 200 Words a Day taking care of vocab, you&rsquo;ll have more time to master grammar
            &amp; comprehension in your other studies, speeding up your overall learning.
          </p>
          <Link href={appUrl("/signup")} className="btn big mt-6">
            Start now &ndash; it&rsquo;s free
          </Link>
        </div>

        {/* "Get even more out of your other studies" — under the collage, desktop only. */}
        <div className="pointer-events-none absolute bottom-0 left-[16%] z-10 hidden xl:block">
          <CalloutAnnotation
            text="Get even more out of your other studies"
            wrapRotate="rotate-[8.17deg]"
            arrowClass="rotate-[-122.58deg]"
            widthClass="w-[160px]"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Section 6 · Features — "why language learners love 200 Words a Day": three
 * alternating copy/visual blocks. A · Curriculum pairs a scattered word-card
 * collage with the "thousands of words" pitch; B · Testing puts the copy beside a
 * mock progress-showcase inside a white card; C · Complementary Tools rings the
 * 200WAD mark with companion study-tool logos. Hand-drawn callouts annotate B & C
 * on desktop.
 */
export function Features() {
  return (
    <section id="how" aria-label="Why language learners love 200 Words a Day">
      <div className="container flex flex-col items-center pt-20 sm:pt-24">
        <p className="eyebrow text-center">Why language learners love 200 Words a Day</p>
      </div>
      <BlockCurriculum />
      <BlockTesting />
      <BlockTools />
    </section>
  );
}
