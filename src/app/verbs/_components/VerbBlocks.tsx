import type { VerbConjugationData } from "@/lib/queries/verbs";
import { ConjugationTable } from "./ConjugationTable";

// An ordered content block from the legacy page, preserved in original document
// order. `para` carries a small, self-generated set of inline tags (strong / em /
// a) so links and emphasis survive; `conjugation` is a marker that renders the
// styled table in its original mid-page position.
export type VerbBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "para"; html: string }
  | { type: "image"; src: string; alt: string }
  | { type: "conjugation" };

export function VerbBlocks({
  blocks,
  languageCode,
  conjugation,
}: {
  blocks: VerbBlock[];
  languageCode: string;
  conjugation: VerbConjugationData;
}) {
  return (
    <div className="verb-body">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const cls = block.level === 2 ? "heading-s" : "heading-xs";
            return (
              <h2 key={i} className={`${cls} verb-section-title`}>
                {block.text}
              </h2>
            );
          }
          case "para":
            return (
              <p
                key={i}
                className="verb-body-p"
                // Self-generated markup only (strong / em / a) — no user input.
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          case "image":
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={block.src}
                alt={block.alt}
                className="verb-body-img"
              />
            );
          case "conjugation":
            return (
              <ConjugationTable
                key={i}
                languageCode={languageCode}
                simple={conjugation.simple}
                compound={conjugation.compound}
              />
            );
        }
      })}
    </div>
  );
}
