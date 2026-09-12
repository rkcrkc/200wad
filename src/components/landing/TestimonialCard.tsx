import Image from "next/image";
import { ChevronRight } from "lucide-react";

/** One learner quote. Heights are content-driven, so short and long quotes size
 *  their cards naturally (matching the Figma "Testimonial Card" instances). */
export type Review = { quote: string; name: string };

/** Canonical learner-quote bank, shared by the Section 3 (Testimonials) and
 *  Section 7 (Social proof) marquees. */
export const REVIEWS: Review[] = [
  { quote: "“I learned 2,000 Spanish words within a week!”", name: "Rolf J. Backström" },
  {
    quote:
      "“Your 200 Words A Day German course is so much fun and the retention levels are absolutely fabulous”",
    name: "Steve A, Australia",
  },
  { quote: "“It is hard to keep from laughing!”", name: "Rolf J. Backström" },
  {
    quote:
      "“I completed 41 lessons with a total vocabulary of 1,048 palabras (words) in less than two months!”",
    name: "Doug Roy, UK",
  },
];

/** Figma "Testimonial Card" — white card, 2px ink border, 14px radius, hard 3px
 *  offset shadow. Quote (Inter Medium 18/1.4) above an avatar · name · chevron
 *  detail row. Fixed 366px wide; height follows the quote. Decorative chevron. */
export function TestimonialCard({ quote, name }: Review) {
  return (
    <figure className="flex w-[366px] shrink-0 flex-col gap-6 rounded-[14px] border-2 border-[var(--ink)] bg-white p-[30px] shadow-[3px_3px_0_var(--ink)]">
      <blockquote className="quote text-[18px] font-medium leading-[1.4] text-[var(--ink)]">
        {quote}
      </blockquote>
      <figcaption className="flex w-full items-center gap-2">
        <Image
          src="/marketing/g/avatar.svg"
          alt=""
          width={32}
          height={32}
          className="shrink-0"
        />
        <span className="eyebrow flex-1">{name}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--mono-soft)]" aria-hidden />
      </figcaption>
    </figure>
  );
}
