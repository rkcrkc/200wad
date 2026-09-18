// The intro/notes prose is stored as text-only paragraphs wrapped in <p> by the
// import parser (legacy markup dropped). We re-extract the text and render it as
// escaped React paragraphs — never dangerouslySetInnerHTML — so nothing legacy can
// inject markup.
function toParagraphs(html: string): string[] {
  return html
    .split(/<\/p>/i)
    .map((chunk) => chunk.replace(/<[^>]*>/g, "").trim())
    .filter(Boolean);
}

// The legacy source mashes the section marker (e.g. "MORE on the FRENCH VERB ALLER")
// into the first paragraph. Strip a leading marker so it doesn't duplicate our heading.
const LEAD_MARKERS = [
  /^MORE on the .*? VERB \S+\s*/i,
  /^HOW TO CONQUER .*? CONJUGATION(?: of \S+)?\s*/i,
];

export function VerbProse({ html, heading }: { html: string; heading: string }) {
  const paras = toParagraphs(html);
  if (paras.length > 0) {
    for (const m of LEAD_MARKERS) paras[0] = paras[0].replace(m, "");
    if (!paras[0]) paras.shift();
  }
  if (paras.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="heading-s">{heading}</h2>
      <div className="verb-prose mt-3">
        {paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
