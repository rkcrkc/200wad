interface LegalDocProps {
  title: string;
  /** Human-readable last-updated date, e.g. "9 July 2026". */
  lastUpdated: string;
  /** Optional lead paragraph shown under the header. */
  intro?: React.ReactNode;
  /** Body content — plain semantic HTML (h2/h3/p/ul/ol/a/strong). */
  children: React.ReactNode;
}

/**
 * Shared layout for the Privacy / Terms / Refunds pages on the marketing `.site`
 * brand layer — the successor to the old app-layer `@/components/marketing/LegalPage`.
 *
 * Renders a narrow, readable column and styles the semantic children so each page
 * only supplies prose. The enclosing `.site` scope already gives `h1/h2/h3` the
 * Bricolage ExtraBold display treatment and exposes the brand tokens, so the
 * arbitrary-variant selectors below only set size, colour, spacing and list/link
 * decoration — never re-declaring the brand utilities themselves.
 */
export function LegalDoc({ title, lastUpdated, intro, children }: LegalDocProps) {
  return (
    <section aria-label={title} className="container py-14 sm:py-20">
      <div className="mx-auto flex max-w-[720px] flex-col">
        <p className="eyebrow">Legal</p>
        <h1 className="heading-xl mt-3 text-[var(--ink)]">{title}</h1>
        <p className="mt-4 text-[14px] text-[var(--ink-soft)]">Last updated: {lastUpdated}</p>
        {intro ? <div className="mt-6 label-lg text-[var(--ink-soft)]">{intro}</div> : null}

        <div className="mt-10 flex flex-col gap-4 body text-[var(--ink-soft)] [&_a]:font-medium [&_a]:text-[var(--ink)] [&_a]:underline [&_a]:decoration-dotted [&_a]:underline-offset-2 [&_a:hover]:decoration-solid [&_h2]:mb-1 [&_h2]:mt-10 [&_h2]:text-[24px] [&_h2]:leading-[1.3] [&_h2]:text-[var(--ink)] [&_h3]:mb-1 [&_h3]:mt-6 [&_h3]:text-[20px] [&_h3]:leading-[1.3] [&_h3]:text-[var(--ink)] [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-6 [&_strong]:font-semibold [&_strong]:text-[var(--ink)] [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6">
          {children}
        </div>
      </div>
    </section>
  );
}
