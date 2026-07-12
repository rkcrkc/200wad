import { Section } from "@/components/marketing/Section";

interface LegalPageProps {
  title: string;
  /** Human-readable last-updated date, e.g. "9 July 2026". */
  lastUpdated: string;
  /** Optional lead paragraph shown under the header. */
  intro?: React.ReactNode;
  /** Body content — plain semantic HTML (h2/h3/p/ul/ol/a/strong). */
  children: React.ReactNode;
}

/**
 * Shared layout for the Privacy Policy / Terms / Refunds pages. Renders a
 * narrow, readable column and styles the semantic children (h2/h3/p/ul/…)
 * with the design-system typography so each page only has to supply prose.
 */
export function LegalPage({ title, lastUpdated, intro, children }: LegalPageProps) {
  return (
    <Section width="sm" className="pt-16 sm:pt-24">
      <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 text-small-regular text-foreground/50">Last updated: {lastUpdated}</p>
      {intro ? <div className="mt-6 text-large-medium text-foreground/70">{intro}</div> : null}

      <div className="mt-10 space-y-4 text-regular-medium leading-relaxed text-foreground/80 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_h2]:mt-10 [&_h2]:mb-1 [&_h2]:text-xl-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-1 [&_h3]:text-large-semibold [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>
    </Section>
  );
}
