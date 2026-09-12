import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

/**
 * Section 10 · About — "Our story" in a single big bordered card. A tan visual
 * panel on the left pairs with the copy column on the right: eyebrow, headline,
 * the origin-story paragraph, a founder avatar + credit, and a secondary
 * "Read our story" CTA. Stacks to one column below lg.
 */
export function About() {
  return (
    <section id="about" aria-label="Our story" className="bg-[#fffdf7] py-16 sm:py-24">
      <div className="container">
        <div className="flex flex-col gap-10 rounded-[30px] border-2 border-[var(--ink)] bg-white p-6 shadow-[6px_6px_0_var(--ink)] sm:p-10 lg:flex-row lg:gap-20 lg:p-12">
          {/* Visual — decorative tan panel; fills the card height on desktop. */}
          <div
            className="min-h-[240px] flex-1 self-stretch rounded-[20px] bg-[var(--paper)] lg:min-h-0"
            aria-hidden
          />

          <div className="flex flex-1 flex-col items-start gap-[30px]">
            <div className="flex flex-col items-start gap-4">
              <p className="eyebrow">Our story</p>
              <h2 className="heading-xl text-[var(--ink)]">
                Learning vocab was such a bore, so we developed 200WAD
              </h2>
            </div>

            <p className="body text-[var(--ink-soft)]">
              200 Words a Day started as a labour of love back in 2004, and picked up thousands of
              gloriously loyal fans who liked our quirky, not-so-serious take on learning. Trouble
              is, our original tech creaked a little louder every year &mdash; and the &ldquo;are you
              ever going online?&rdquo; emails kept coming. Well: here we are. French leads the way,
              with Spanish, German and Italian right alongside, and mobile apps on the way.
            </p>

            <div className="flex w-full items-center gap-2">
              <Image
                src="/marketing/g/founder-kevin.png"
                alt=""
                width={48}
                height={48}
                className="shrink-0 rounded-full"
              />
              <span className="eyebrow flex-1">Kevin Crocombe, creator</span>
            </div>

            <Link href="/about" className="btn secondary">
              Read our story
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
