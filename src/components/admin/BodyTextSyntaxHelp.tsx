"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { genderColor, defaultHighlightColor } from "@/lib/design-tokens";
import { parseFormattedText } from "@/lib/utils/parseFormattedText";

type RowKey =
  | "bold"
  | "italic"
  | "underline"
  | "masculine"
  | "feminine"
  | "neuter"
  | "mixed"
  | "highlight"
  | "heading"
  | "bullet"
  | "numbered"
  | "link"
  | "table"
  | "hr"
  | "combined"
  | "paragraph"
  | "lineBreak";

interface RowDef {
  key: RowKey;
  label: string;
  source: string;
  note?: string;
}

const COMMON_ROWS: RowDef[] = [
  { key: "bold", label: "Bold", source: "**text**" },
  { key: "italic", label: "Italic", source: "*text*" },
  { key: "underline", label: "Underline", source: "<u>text</u>" },
];

const MULTI_GENDER_ROWS: RowDef[] = [
  { key: "masculine", label: "Masculine (blue)", source: "{{m|text}}" },
  { key: "feminine", label: "Feminine (red)", source: "{{f|text}}" },
  { key: "neuter", label: "Neuter (orange)", source: "{{n|text}}" },
  { key: "mixed", label: "Mixed (green)", source: "{{mf|text}}" },
];

const WORD_HIGHLIGHT_ROW: RowDef = {
  key: "highlight",
  label: "Row's gender color",
  source: "{{text}}",
  note: "Falls back to green if the word has no gender",
};

const STRUCTURE_ROWS: RowDef[] = [
  {
    key: "heading",
    label: "Heading",
    source: "# text",
    note: "## or ### for smaller headings",
  },
  { key: "bullet", label: "Bullet list", source: "- item" },
  { key: "numbered", label: "Numbered list", source: "1. item" },
  {
    key: "link",
    label: "Link",
    source: "[text](https://example.com)",
  },
  {
    key: "table",
    label: "Table",
    source: "| A | B |\n| --- | --- |\n| 1 | 2 |",
    note: "Pipe rows; second row of dashes makes a header",
  },
  {
    key: "hr",
    label: "Divider",
    source: "---",
    note: "Three or more dashes on their own line",
  },
];

const TRAILING_ROWS_MULTI: RowDef[] = [
  {
    key: "combined",
    label: "Combined",
    source: "<u>{{m|**Heading**}}</u>",
    note: "Underlined, bold, blue",
  },
  {
    key: "paragraph",
    label: "Paragraph break",
    source: "(blank line)",
    note: "Press Enter twice",
  },
  {
    key: "lineBreak",
    label: "Line break",
    source: "(single newline)",
    note: "Press Enter once",
  },
];

const TRAILING_ROWS_WORD: RowDef[] = [
  {
    key: "combined",
    label: "Combined",
    source: "<u>{{**Heading**}}</u>",
    note: "Underlined, bold, gender-colored",
  },
  {
    key: "paragraph",
    label: "Paragraph break",
    source: "(blank line)",
    note: "Press Enter twice",
  },
  {
    key: "lineBreak",
    label: "Line break",
    source: "(single newline)",
    note: "Press Enter once",
  },
];

interface BodyTextSyntaxHelpProps {
  /** Defaults to true. Set false for compact admin contexts. */
  defaultOpen?: boolean;
  className?: string;
  /** "word" hides M/F/N/M/F gender markers; "multi" shows them. */
  variant?: "word" | "multi";
}

/**
 * Collapsible cheat-sheet for the memory_trigger_text marker syntax used by
 * trigger text (word/phrase/sentence) and body content (fact/information).
 * Renders both the source markup and a live preview of each marker.
 */
export function BodyTextSyntaxHelp({
  defaultOpen = true,
  className,
  variant = "multi",
}: BodyTextSyntaxHelpProps) {
  const [open, setOpen] = useState(defaultOpen);

  const rows: RowDef[] =
    variant === "word"
      ? [
          ...COMMON_ROWS,
          WORD_HIGHLIGHT_ROW,
          ...STRUCTURE_ROWS,
          ...TRAILING_ROWS_WORD,
        ]
      : [
          ...COMMON_ROWS,
          ...MULTI_GENDER_ROWS,
          ...STRUCTURE_ROWS,
          ...TRAILING_ROWS_MULTI,
        ];

  return (
    <div
      className={
        open
          ? `rounded-lg bg-gray-100 px-3 py-2.5 ${className ?? ""}`
          : `inline-block ${className ?? ""}`
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          open
            ? "inline-flex items-center gap-1.5 text-xs font-normal text-gray-600"
            : "inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-normal text-gray-500 hover:bg-gray-200 hover:text-gray-700"
        }
      >
        Text formatting guide
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2.5">
          <div className="grid grid-cols-[minmax(120px,auto)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Effect
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Type
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Renders as
            </div>
            {rows.map((row) => (
              <SyntaxRow key={row.key} row={row} />
            ))}
          </div>

          <div className="mt-3 space-y-0.5 text-[11px] text-muted-foreground">
            <p>
              <strong className="text-foreground">Tip:</strong> markers can
              nest, e.g.{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px] text-foreground">
                {`<u>{{f|**Feminine - le**}}</u>`}
              </code>{" "}
              renders as{" "}
              <span style={{ color: genderColor.f, fontWeight: 600 }}>
                <u>
                  <strong>Feminine - le</strong>
                </u>
              </span>
              .
            </p>
            <p>
              Color tags only apply to text inside the braces — surrounding
              prose stays the default text color.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SyntaxRow({ row }: { row: RowDef }) {
  return (
    <>
      <div className="text-foreground">{row.label}</div>
      <div>
        <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-foreground">
          {row.source}
        </code>
      </div>
      <div className="text-foreground">
        <Preview row={row} />
        {row.note && (
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {row.note}
          </div>
        )}
      </div>
    </>
  );
}

function Preview({ row }: { row: RowDef }) {
  switch (row.key) {
    case "bold":
      return <strong>text</strong>;
    case "italic":
      return <em>text</em>;
    case "underline":
      return <u>text</u>;
    case "masculine":
      return (
        <span style={{ color: genderColor.m, fontWeight: 600 }}>text</span>
      );
    case "feminine":
      return (
        <span style={{ color: genderColor.f, fontWeight: 600 }}>text</span>
      );
    case "neuter":
      return (
        <span style={{ color: genderColor.n, fontWeight: 600 }}>text</span>
      );
    case "mixed":
      return (
        <span style={{ color: genderColor.mf, fontWeight: 600 }}>text</span>
      );
    case "highlight":
      return (
        <span style={{ color: defaultHighlightColor, fontWeight: 600 }}>
          text
        </span>
      );
    case "heading":
      return (
        <span className="text-base font-semibold text-foreground">
          Heading
        </span>
      );
    case "bullet":
      return (
        <ul className="list-inside list-disc text-foreground">
          <li>item</li>
        </ul>
      );
    case "numbered":
      return (
        <ol className="list-inside list-decimal text-foreground">
          <li>item</li>
        </ol>
      );
    case "link":
      return (
        <a
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80"
        >
          text
        </a>
      );
    case "table":
      return (
        <table className="border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-semibold">
                A
              </th>
              <th className="border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-semibold">
                B
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-1.5 py-0.5">1</td>
              <td className="border border-gray-300 px-1.5 py-0.5">2</td>
            </tr>
          </tbody>
        </table>
      );
    case "hr":
      return (
        <hr className="my-1 border-0 border-t border-gray-300" />
      );
    case "combined":
      // Word variant uses {{...}} (gender-color); multi uses {{m|...}} (blue).
      // Use parseFormattedText so headword context drives color when "word".
      return parseFormattedText(row.source, { paragraphs: false });
    case "paragraph":
      return (
        <span className="text-muted-foreground">— starts a new paragraph</span>
      );
    case "lineBreak":
      return (
        <span className="text-muted-foreground">— line break within paragraph</span>
      );
    default:
      return null;
  }
}
