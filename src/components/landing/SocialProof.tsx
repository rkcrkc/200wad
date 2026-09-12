import { TestimonialCard, REVIEWS } from "./TestimonialCard";

/** Same learner-quote bank as Section 3, rotated so this row doesn't open on the
 *  same card the top marquee does. */
const SOCIAL_REVIEWS = [...REVIEWS.slice(2), ...REVIEWS.slice(0, 2)];

/**
 * Section 7 · Social proof — a second full-bleed testimonial marquee, sat on the
 * tan page fill just above pricing. It scrolls the opposite way to the Section 3
 * row (`.marquee--reverse`) and drops the "more reviews" pill, so it reads as
 * a closing wall of proof rather than a repeat.
 */
export function SocialProof() {
  return (
    <section aria-label="Learner reviews" className="bg-[var(--paper)] py-16 sm:py-24">
      {/* pb leaves room for the cards' 3px offset shadow, which the marquee's
          overflow:hidden would otherwise clip on a full-height card. */}
      <div className="marquee marquee--steady marquee--reverse pb-2">
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
              {SOCIAL_REVIEWS.map((r, i) => (
                <TestimonialCard key={`${dup}-${i}`} quote={r.quote} name={r.name} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
