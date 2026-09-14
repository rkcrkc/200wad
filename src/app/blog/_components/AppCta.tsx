import Link from "next/link";
import { appUrl } from "@/lib/host";

/**
 * In-article app CTA — a bordered callout box (below the author bio) nudging readers
 * into the product. Simple copy + "Start free" button beside an image slot; the slot
 * falls back to a tan panel until a real image URL is passed in.
 */
export function AppCta({ imageSrc }: { imageSrc?: string | null }) {
  return (
    <section className="mt-8">
      <div className="flex flex-col gap-5 rounded-[20px] bg-[var(--paper)] p-6 sm:flex-row sm:items-center sm:gap-6">
        {/* Image slot */}
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt=""
            className="aspect-square w-full shrink-0 rounded-[14px] object-cover sm:w-[140px]"
          />
        ) : (
          <div
            className="aspect-square w-full shrink-0 rounded-[14px] bg-[var(--tan)] sm:w-[140px]"
            aria-hidden
          />
        )}

        {/* Copy */}
        <div className="flex flex-col items-start gap-3">
          <p className="eyebrow">Start learning</p>
          <h3 className="heading-ml text-[var(--ink)]">Learn vocab that actually sticks</h3>
          <p className="text-[15px] leading-[1.6] text-[var(--ink-soft)]">
            200 Words a Day hooks every word onto an absurd cartoon you can&rsquo;t forget.
            10 free lessons per language, no credit card needed.
          </p>
          <Link href={appUrl("/signup")} className="btn big">
            Start free
          </Link>
        </div>
      </div>
    </section>
  );
}
