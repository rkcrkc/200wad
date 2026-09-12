import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TestimonialCard, REVIEWS } from "./TestimonialCard";

/**
 * Section 3 · Testimonials — a full-bleed marquee of learner quotes that scrolls
 * left forever (pausing on hover, freezing under reduced motion via the shared
 * `.marquee` rules), with a "more reviews" pill button centred beneath it. The
 * track holds two identical card groups and slides -50%, so the loop is seamless.
 */
export function Testimonials() {
  return (
    <section aria-label="What learners say" className="py-10 sm:py-14">
      {/* pb leaves room for the cards' 3px offset shadow, which the marquee's
          overflow:hidden would otherwise clip on a full-height card. */}
      <div className="marquee marquee--steady pb-2">
        <div
          className="marquee__track"
          style={{ ["--marquee-dur" as string]: "50s" }}
        >
          {[0, 1].map((dup) => (
            <div
              key={dup}
              className="marquee__group !items-start gap-[30px] pr-[30px]"
              aria-hidden={dup === 1}
            >
              {REVIEWS.map((r, i) => (
                <TestimonialCard key={`${dup}-${i}`} quote={r.quote} name={r.name} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="#reviews"
          className="inline-flex items-center gap-3 rounded-full px-4 py-2.5 !no-underline transition-colors hover:bg-white"
        >
          <Image src="/marketing/g/avatar-stack.svg" alt="" width={50} height={22} />
          <span className="eyebrow">More reviews (100+)</span>
          <ChevronRight className="h-4 w-4 text-[var(--mono-soft)]" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
