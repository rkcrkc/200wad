import { EmailCaptureCard } from "./EmailCaptureCard";

/**
 * Section 12 · Email Capture — the "word of the day" capture card on its own
 * light-tan page band, above the blog. The card itself (`EmailCaptureCard`) is
 * shared with the footer so the two stay identical.
 */
export function EmailCapture() {
  return (
    <section aria-label="Get word of the day" className="bg-[#fffdf7] pb-16 sm:pb-24">
      <div className="container">
        <EmailCaptureCard />
      </div>
    </section>
  );
}
