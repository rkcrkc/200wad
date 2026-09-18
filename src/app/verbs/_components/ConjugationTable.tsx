import type { VerbTense } from "@/lib/queries/verbs";

// Person columns are stored positionally (1st-sing … 3rd-plural) under the keys
// je/tu/il/nous/vous/ils. The displayed pronoun labels are language-specific, so a
// Spanish table shows yo/tú/él… not je/tu/il….
const PRONOUNS: Record<string, [string, string, string, string, string, string]> = {
  fr: ["je / j'", "tu", "il / elle", "nous", "vous", "ils / elles"],
  es: ["yo", "tú", "él / ella", "nosotros", "vosotros", "ellos / ellas"],
  de: ["ich", "du", "er / sie", "wir", "ihr", "sie"],
  it: ["io", "tu", "lui / lei", "noi", "voi", "loro"],
  cy: ["1s", "2s", "3s", "1pl", "2pl", "3pl"],
};
const PERSON_KEYS = ["je", "tu", "il", "nous", "vous", "ils"] as const;

function TenseTable({
  title,
  rows,
  pronouns,
}: {
  title: string;
  rows: VerbTense[];
  pronouns: string[];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h2 className="heading-s verb-table-section-title">{title}</h2>
      <div className="verb-table-scroll">
        <table className="verb-table">
          <thead>
            <tr>
              <th className="tense-cell">Tense</th>
              {pronouns.map((p, i) => (
                <th key={i} scope="col">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <th scope="row" className="tense-cell">
                  <span className="verb-tense-en">{row.en}</span>
                  {row.native && <span className="verb-tense-native"> · {row.native}</span>}
                  {row.gloss && (
                    <>
                      <br />
                      <span className="verb-tense-gloss">“{row.gloss}”</span>
                    </>
                  )}
                </th>
                {PERSON_KEYS.map((k) => (
                  <td key={k}>
                    <span className="form">{row.forms[k]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ConjugationTable({
  languageCode,
  simple,
  compound,
}: {
  languageCode: string;
  simple: VerbTense[];
  compound: VerbTense[];
}) {
  const pronouns = PRONOUNS[languageCode] ?? PRONOUNS.fr;
  return (
    <div className="mt-8 flex flex-col gap-2">
      <TenseTable title="Simple tenses" rows={simple} pronouns={pronouns} />
      <TenseTable title="Compound tenses" rows={compound} pronouns={pronouns} />
    </div>
  );
}
