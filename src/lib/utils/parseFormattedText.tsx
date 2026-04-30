/**
 * Inline + block formatting parser shared by trigger text (word/phrase/sentence)
 * and body text (fact/information). Backed by the same `memory_trigger_text`
 * column — context is driven by `options.headword`:
 *
 * Inline syntax:
 *   - **bold**             → <strong>
 *   - *italic*             → <em>
 *   - <u>...</u>           → <u>
 *   - {{m|text}}           → blue, bold (masculine)
 *   - {{f|text}}           → red, bold (feminine)
 *   - {{n|text}}           → orange, bold (neuter)
 *   - {{mf|text}}          → green, bold (mixed)
 *   - {{text}}             → bold in row's gender color (default green)
 *   - [text](url)          → external link (target="_blank")
 *
 * Block syntax (only when paragraphs=true):
 *   - "# heading"          → <h2>
 *   - "## heading"         → <h3>
 *   - "### heading"        → <h4>
 *   - "- item" / "+ item"  → <ul><li>... (hyphen/plus + space or tab)
 *   - "1. item"            → <ol><li>... (number + period + space or tab)
 *   - "---" / "***" / "- - -" (3+ repeats) → <hr>
 *   - "| a | b |"          → <table> (markdown pipe table; optional
 *     "| --- | --- |" separator row makes the first row a <thead>)
 *   - 2+ consecutive lines with tabs → <table> (legacy verb-table support)
 *   - blank line           → paragraph break
 *
 * Trigger context (when `headword` is set):
 *   - Plain text gets explicit color (#141515 default,
 *     dark gender shade when `isPlaying`).
 *   - When the source has NO inline markers, falls back to legacy auto-highlight:
 *     word tokens matching the headword (case-insensitive) and ALL CAPS words
 *     get gender-colored bold. Preserves the long-standing playback-highlight UX.
 *
 * Body context (no `headword`):
 *   - Plain text inherits color from parent (so `prose` / wrapper styles win).
 *   - No auto-highlight.
 */

import React from "react";
import {
  defaultHighlightColor,
  defaultHighlightColorDark,
  genderColor,
  genderColorDark,
} from "@/lib/design-tokens";

const TAG_COLORS: Record<string, string> = {
  m: genderColor.m,
  f: genderColor.f,
  n: genderColor.n,
  mf: genderColor.mf,
};

function getHighlight(gender?: string | null): string {
  if (gender && gender in genderColor) return genderColor[gender];
  return defaultHighlightColor;
}

function getHighlightDark(gender?: string | null): string {
  if (gender && gender in genderColorDark) return genderColorDark[gender];
  return defaultHighlightColorDark;
}

export interface ParseFormattedOptions {
  /** Word gender — colors row-gender markers (`{{text}}`) and headword highlight. */
  gender?: string | null;
  /**
   * When set, switches to trigger context: explicit base coloring on plain
   * text and (if source has no markers) auto-highlight of headword + ALL CAPS
   * tokens.
   */
  headword?: string;
  /** Audio-playback highlight: plain text uses dark gender shade. Trigger only. */
  isPlaying?: boolean;
  /** Wrap paragraphs in <p>. Default true. Set false for inline single-line use. */
  paragraphs?: boolean;
}

interface Ctx {
  gender?: string | null;
  isPlaying: boolean;
  cleanHeadword: string;
  triggerStyle: boolean;
  /** Source has no markers — auto-highlight tokens (trigger context only). */
  useAutoHighlight: boolean;
  /** Inside a {{...}} colored marker — color/bold come from the marker span. */
  inMarker: boolean;
}

const MARKER_REGEX = /\{\{|\*\*?|<u>|\[[^\]]+\]\(/;
function hasAnyMarkers(text: string): boolean {
  return MARKER_REGEX.test(text);
}

function emitTriggerPlain(
  text: string,
  ctx: Ctx,
  keyBase: string,
): React.ReactNode[] {
  const baseColor = ctx.isPlaying ? getHighlightDark(ctx.gender) : "#141515";
  const highlight = getHighlight(ctx.gender);
  const tokens = text.split(/(\s+)/); // keep separators
  const out: React.ReactNode[] = [];
  tokens.forEach((tok, idx) => {
    if (!tok) return;
    if (/^\s+$/.test(tok)) {
      out.push(
        <React.Fragment key={`${keyBase}ws${idx}`}>{tok}</React.Fragment>,
      );
      return;
    }
    const cleanTok = tok.toLowerCase().replace(/[!?.,'"]/g, "");
    const headwordMatch =
      ctx.useAutoHighlight &&
      ctx.cleanHeadword.length > 0 &&
      (cleanTok === ctx.cleanHeadword ||
        cleanTok.includes(ctx.cleanHeadword));
    const allCaps =
      ctx.useAutoHighlight &&
      /^[A-Z]{2,}[!?.,'"]*$/.test(tok) &&
      tok.trim().length > 1;
    if (headwordMatch || allCaps) {
      out.push(
        <span
          key={`${keyBase}h${idx}`}
          className="font-bold"
          style={{ color: highlight }}
        >
          {tok}
        </span>,
      );
    } else {
      out.push(
        <span key={`${keyBase}p${idx}`} style={{ color: baseColor }}>
          {tok}
        </span>,
      );
    }
  });
  return out;
}

function emitBodyPlain(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const parts = text.split("\n");
  parts.forEach((part, idx) => {
    if (part) {
      out.push(<React.Fragment key={`${keyBase}t${idx}`}>{part}</React.Fragment>);
    }
    if (idx < parts.length - 1) {
      out.push(<br key={`${keyBase}br${idx}`} />);
    }
  });
  return out;
}

function parseInline(
  text: string,
  ctx: Ctx,
  keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let buffer = "";
  let key = 0;

  const flush = () => {
    if (!buffer) return;
    const keyBase = `${keyPrefix}f${key++}-`;
    if (ctx.inMarker) {
      // Color comes from the surrounding marker span — emit raw text.
      if (ctx.triggerStyle) {
        // Trigger style: \n collapses to whitespace, single fragment
        nodes.push(<React.Fragment key={`${keyBase}t`}>{buffer}</React.Fragment>);
      } else {
        nodes.push(...emitBodyPlain(buffer, keyBase));
      }
    } else if (ctx.triggerStyle) {
      nodes.push(...emitTriggerPlain(buffer, ctx, keyBase));
    } else {
      nodes.push(...emitBodyPlain(buffer, keyBase));
    }
    buffer = "";
  };

  while (i < text.length) {
    // [text](url) — link
    if (text[i] === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const url = text.slice(closeBracket + 2, closeParen);
          flush();
          const childKey = `${keyPrefix}l${key}-`;
          nodes.push(
            <a
              key={`${keyPrefix}l${key++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:opacity-80"
            >
              {parseInline(linkText, ctx, childKey)}
            </a>,
          );
          i = closeParen + 1;
          continue;
        }
      }
    }
    // {{tag|content}} or {{content}}
    if (text[i] === "{" && text[i + 1] === "{") {
      const end = text.indexOf("}}", i + 2);
      if (end !== -1) {
        flush();
        const inner = text.slice(i + 2, end);
        const pipe = inner.indexOf("|");
        let tag: string | null = null;
        let content: string;
        if (pipe !== -1) {
          tag = inner.slice(0, pipe);
          content = inner.slice(pipe + 1);
        } else {
          content = inner;
        }
        const color =
          tag && TAG_COLORS[tag] ? TAG_COLORS[tag] : getHighlight(ctx.gender);
        const childKey = `${keyPrefix}c${key}-`;
        nodes.push(
          <span
            key={`${keyPrefix}c${key++}`}
            style={{ color, fontWeight: 600 }}
          >
            {parseInline(content, { ...ctx, inMarker: true }, childKey)}
          </span>,
        );
        i = end + 2;
        continue;
      }
    }
    // **bold**
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        flush();
        const childKey = `${keyPrefix}b${key}-`;
        nodes.push(
          <strong key={`${keyPrefix}b${key++}`}>
            {parseInline(text.slice(i + 2, end), ctx, childKey)}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }
    // *italic* (single asterisk, not part of **)
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && text[end + 1] !== "*") {
        flush();
        const childKey = `${keyPrefix}i${key}-`;
        nodes.push(
          <em key={`${keyPrefix}i${key++}`}>
            {parseInline(text.slice(i + 1, end), ctx, childKey)}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }
    // <u>...</u>
    if (text.slice(i, i + 3) === "<u>") {
      const end = text.indexOf("</u>", i + 3);
      if (end !== -1) {
        flush();
        const childKey = `${keyPrefix}u${key}-`;
        nodes.push(
          <u key={`${keyPrefix}u${key++}`}>
            {parseInline(text.slice(i + 3, end), ctx, childKey)}
          </u>,
        );
        i = end + 4;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }
  flush();
  return nodes;
}

// ---------------------------------------------------------------------------
// Block-level parser
// ---------------------------------------------------------------------------

type BlockNode =
  | { kind: "heading"; level: 2 | 3 | 4; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; rows: string[][]; hasHeader: boolean }
  | { kind: "hr" }
  | { kind: "paragraph"; text: string };

const HEADING_RE = /^(#{1,3})[ \t]+(.*)$/;
const BULLET_RE = /^[-+][ \t]+(.+)$/;
const NUMBERED_RE = /^\d+\.[ \t]+(.+)$/;
// HR: line is 3+ repeats of -, _, or * (separated by optional whitespace).
// Matches `---`, `***`, `___`, `- - -`, `- - - -`, etc.
const HR_RE = /^\s*([-_*])(?:[ \t]*\1){2,}[ \t]*$/;
// Pipe-table row: starts and ends with `|` (ignoring whitespace).
const PIPE_ROW_RE = /^\s*\|.*\|\s*$/;
// Pipe-table separator row: `| --- | :--- | ---: | :---: |` etc.
const PIPE_SEPARATOR_RE = /^\s*\|(?:[ \t]*:?-+:?[ \t]*\|)+\s*$/;

interface LineKind {
  type:
    | "heading"
    | "bullet"
    | "numbered"
    | "blank"
    | "text"
    | "hr"
    | "pipeRow"
    | "pipeSeparator";
  level?: 2 | 3 | 4;
  content?: string;
  raw: string;
  hasTab: boolean;
}

function classifyLine(line: string): LineKind {
  const hasTab = line.includes("\t");
  const trimmed = line.trim();
  if (trimmed === "") return { type: "blank", raw: line, hasTab: false };

  // Horizontal rule (also catches divider lines like "- - - -")
  if (HR_RE.test(line)) return { type: "hr", raw: line, hasTab };

  const h = trimmed.match(HEADING_RE);
  if (h) {
    const hashes = h[1].length;
    const level = (hashes + 1) as 2 | 3 | 4; // # = h2, ## = h3, ### = h4
    return { type: "heading", level, content: h[2], raw: line, hasTab };
  }

  // Pipe-table separator must be checked before pipeRow.
  if (PIPE_SEPARATOR_RE.test(line))
    return { type: "pipeSeparator", raw: line, hasTab };
  if (PIPE_ROW_RE.test(line)) return { type: "pipeRow", raw: line, hasTab };

  // Bullet — require content has at least one non-`-+` character so we don't
  // mis-classify legacy divider lines like "- - - - parliamo!" (where the
  // dashes are decorative, not list markers).
  const b = trimmed.match(BULLET_RE);
  if (b && /[^-+\s]/.test(b[1]))
    return { type: "bullet", content: b[1], raw: line, hasTab };

  // Numbered — require content has at least one alphabetic character so a
  // bare "1. " or "2. 3. 4." line isn't classified as a list.
  const n = trimmed.match(NUMBERED_RE);
  if (n && /[A-Za-z]/.test(n[1]))
    return { type: "numbered", content: n[1], raw: line, hasTab };

  return { type: "text", raw: line, hasTab };
}

function parsePipeRow(raw: string): string[] {
  let s = raw.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function parseTabRow(raw: string): string[] {
  return raw
    .split(/\t+/)
    .map((c) => c.trim())
    .filter((c) => c !== "");
}

function parseBlocks(text: string): BlockNode[] {
  const lines = text.split("\n").map(classifyLine);
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === "blank") {
      i++;
      continue;
    }

    if (line.type === "hr") {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    if (line.type === "heading") {
      blocks.push({ kind: "heading", level: line.level!, text: line.content! });
      i++;
      continue;
    }

    // Pipe table — markdown-style. Requires 2+ pipe rows; if the second row is
    // a separator, the first row becomes a header.
    if (line.type === "pipeRow") {
      const start = i;
      const rowsRaw: string[] = [];
      let separatorAt = -1;
      while (
        i < lines.length &&
        (lines[i].type === "pipeRow" || lines[i].type === "pipeSeparator")
      ) {
        if (lines[i].type === "pipeSeparator") {
          if (separatorAt === -1) separatorAt = rowsRaw.length;
        } else {
          rowsRaw.push(lines[i].raw);
        }
        i++;
      }
      if (rowsRaw.length >= 2) {
        const cells = rowsRaw.map(parsePipeRow);
        const hasHeader = separatorAt === 1;
        blocks.push({ kind: "table", rows: cells, hasHeader });
        continue;
      }
      // Single pipe row → fall back to paragraph using the original raw.
      blocks.push({ kind: "paragraph", text: lines[start].raw });
      continue;
    }

    if (line.type === "bullet" || line.type === "numbered") {
      const listType: "ul" | "ol" = line.type === "bullet" ? "ul" : "ol";
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i];
        if (cur.type === (listType === "ul" ? "bullet" : "numbered")) {
          items.push(cur.content!);
          i++;
        } else if (cur.type === "blank") {
          // Allow single blank lines between same-kind items (loose lists).
          // Look ahead: if next non-blank is same kind, continue; else stop.
          let j = i + 1;
          while (j < lines.length && lines[j].type === "blank") j++;
          if (
            j < lines.length &&
            lines[j].type === (listType === "ul" ? "bullet" : "numbered")
          ) {
            i = j;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      blocks.push({ kind: listType, items });
      continue;
    }

    // Text run. Two cases:
    //  (a) tab-line: start a tab-table — collect consecutive tab lines,
    //      tolerating single-blank-line gaps between rows (legacy "notes"
    //      tables often have a blank line between every row).
    //  (b) non-tab line: collect consecutive non-tab text lines into a
    //      paragraph. This stops cleanly at the next blank or tab line, so
    //      a "Some examples:" prose intro followed by a tab table doesn't
    //      get glued together.
    if (line.hasTab) {
      const tabLines: string[] = [];
      while (i < lines.length) {
        const cur = lines[i];
        if (cur.type === "text" && cur.hasTab) {
          tabLines.push(cur.raw);
          i++;
        } else if (cur.type === "blank") {
          // Allow blank-line gaps if the next non-blank line is also a
          // tab line (loose table).
          let j = i + 1;
          while (j < lines.length && lines[j].type === "blank") j++;
          if (
            j < lines.length &&
            lines[j].type === "text" &&
            lines[j].hasTab
          ) {
            i = j;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      if (tabLines.length >= 2) {
        const rows = tabLines.map(parseTabRow).filter((r) => r.length > 0);
        if (rows.length >= 2 && rows.every((r) => r.length >= 2)) {
          blocks.push({ kind: "table", rows, hasHeader: false });
          continue;
        }
      }
      // Fallback: render as a paragraph.
      blocks.push({ kind: "paragraph", text: tabLines.join("\n") });
      continue;
    }

    const proseLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].type === "text" &&
      !lines[i].hasTab
    ) {
      proseLines.push(lines[i].raw);
      i++;
    }
    blocks.push({ kind: "paragraph", text: proseLines.join("\n") });
  }

  return blocks;
}

// Explicit Tailwind classes so the parser output renders correctly even when
// the consuming wrapper does not use `prose`. Tailwind v4 preflight strips
// default heading/list styles, so we re-apply them here.
const HEADING_CLASS: Record<2 | 3 | 4, string> = {
  2: "text-xl font-semibold mt-4 mb-2 first:mt-0",
  3: "text-lg font-semibold mt-3 mb-2 first:mt-0",
  4: "text-base font-semibold mt-2 mb-1 first:mt-0",
};
const UL_CLASS = "list-disc list-outside pl-6 my-2 space-y-1";
const OL_CLASS = "list-decimal list-outside pl-6 my-2 space-y-1";
const HR_CLASS = "my-4 border-0 border-t border-gray-200";
const TABLE_CLASS =
  "my-3 w-full border-collapse text-sm overflow-x-auto block md:table";
const TH_CLASS =
  "border border-gray-300 bg-gray-50 px-3 py-1.5 text-left font-semibold align-top";
const TD_CLASS = "border border-gray-300 px-3 py-1.5 align-top";

function renderBlocks(
  blocks: BlockNode[],
  ctx: Ctx,
): React.ReactNode {
  return blocks.map((block, idx) => {
    if (block.kind === "heading") {
      const Tag = (`h${block.level}` as "h2" | "h3" | "h4");
      return (
        <Tag key={`b${idx}`} className={HEADING_CLASS[block.level]}>
          {parseInline(block.text, ctx, `b${idx}-`)}
        </Tag>
      );
    }
    if (block.kind === "ul") {
      return (
        <ul key={`b${idx}`} className={UL_CLASS}>
          {block.items.map((item, j) => (
            <li key={`b${idx}i${j}`}>
              {parseInline(item, ctx, `b${idx}i${j}-`)}
            </li>
          ))}
        </ul>
      );
    }
    if (block.kind === "ol") {
      return (
        <ol key={`b${idx}`} className={OL_CLASS}>
          {block.items.map((item, j) => (
            <li key={`b${idx}i${j}`}>
              {parseInline(item, ctx, `b${idx}i${j}-`)}
            </li>
          ))}
        </ol>
      );
    }
    if (block.kind === "hr") {
      return <hr key={`b${idx}`} className={HR_CLASS} />;
    }
    if (block.kind === "table") {
      const headerRow = block.hasHeader ? block.rows[0] : null;
      const bodyRows = block.hasHeader ? block.rows.slice(1) : block.rows;
      return (
        <table key={`b${idx}`} className={TABLE_CLASS}>
          {headerRow && (
            <thead>
              <tr>
                {headerRow.map((cell, ci) => (
                  <th key={`b${idx}h${ci}`} className={TH_CLASS}>
                    {parseInline(cell, ctx, `b${idx}h${ci}-`)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={`b${idx}r${ri}`}>
                {row.map((cell, ci) => (
                  <td key={`b${idx}r${ri}c${ci}`} className={TD_CLASS}>
                    {parseInline(cell, ctx, `b${idx}r${ri}c${ci}-`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return (
      <p key={`b${idx}`}>{parseInline(block.text, ctx, `b${idx}-`)}</p>
    );
  });
}

/**
 * Parse formatted text into React nodes.
 *
 * Defaults to body context (paragraph-wrapped, marker-only). Pass `headword`
 * to switch to trigger context (legacy parseTriggerText behavior preserved).
 */
export function parseFormattedText(
  text: string,
  options?: ParseFormattedOptions,
): React.ReactNode {
  const {
    gender = null,
    headword,
    isPlaying = false,
    paragraphs = true,
  } = options ?? {};
  const triggerStyle = !!headword;
  const useAutoHighlight = triggerStyle && !hasAnyMarkers(text);
  const cleanHeadword = (headword || "")
    .toLowerCase()
    .replace(/[!?.,'"]/g, "");

  const ctx: Ctx = {
    gender,
    isPlaying,
    cleanHeadword,
    triggerStyle,
    useAutoHighlight,
    inMarker: false,
  };

  if (!paragraphs) {
    return parseInline(text, ctx, "p0-");
  }
  return renderBlocks(parseBlocks(text), ctx);
}
