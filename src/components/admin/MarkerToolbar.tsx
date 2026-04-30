"use client";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  Heading,
  List,
  ListOrdered,
  Link as LinkIcon,
  Table as TableIcon,
  Eraser,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { genderColor } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Discriminated union of editor actions.
 *
 * - `wrap`: insert `before`/`after` around the selection (inline markers).
 * - `linePrefix`: prefix each non-empty line in the selection with `prefix`.
 * - `orderedList`: prefix each non-empty line with incrementing "1. ", "2. ", ...
 * - `link`: insert `[text](url)` — selection becomes link text, URL gets focus.
 * - `clear`: strip all formatting markers from the selection.
 */
export type MarkerAction =
  | { kind: "wrap"; before: string; after: string }
  | { kind: "linePrefix"; prefix: string }
  | { kind: "orderedList" }
  | { kind: "link" }
  | { kind: "table" }
  | { kind: "clear" };

interface MarkerToolbarProps {
  onAction: (action: MarkerAction) => void;
  /** Called on mousedown — used to keep textarea selection alive while clicking. */
  onMouseDown?: () => void;
  /**
   * Variant: "word" (single-gender) or "multi" (multi-gender).
   * - word: shows Highlighter button for {{text}} (row gender color)
   * - multi: shows M/F/N/M/F gender buttons
   * Defaults to "multi".
   */
  variant?: "word" | "multi";
  className?: string;
}

interface ButtonSpec {
  label: string;
  action: MarkerAction;
  /** lucide icon */
  Icon?: React.ComponentType<{ className?: string }>;
  /** glyph if no icon */
  glyph?: string;
  /** custom text/border color (for gender buttons) */
  color?: string;
}

const FORMAT_BUTTONS: ButtonSpec[] = [
  {
    label: "Bold (**text**)",
    action: { kind: "wrap", before: "**", after: "**" },
    Icon: Bold,
  },
  {
    label: "Italic (*text*)",
    action: { kind: "wrap", before: "*", after: "*" },
    Icon: Italic,
  },
  {
    label: "Underline (<u>text</u>)",
    action: { kind: "wrap", before: "<u>", after: "</u>" },
    Icon: UnderlineIcon,
  },
];

const COLOR_BUTTONS: ButtonSpec[] = [
  {
    label: "Masculine — blue ({{m|text}})",
    action: { kind: "wrap", before: "{{m|", after: "}}" },
    glyph: "M",
    color: genderColor.m,
  },
  {
    label: "Feminine — red ({{f|text}})",
    action: { kind: "wrap", before: "{{f|", after: "}}" },
    glyph: "F",
    color: genderColor.f,
  },
  {
    label: "Neuter — orange ({{n|text}})",
    action: { kind: "wrap", before: "{{n|", after: "}}" },
    glyph: "N",
    color: genderColor.n,
  },
  {
    label: "Mixed — green ({{mf|text}})",
    action: { kind: "wrap", before: "{{mf|", after: "}}" },
    glyph: "M/F",
    color: genderColor.mf,
  },
];

const HIGHLIGHT_BUTTON: ButtonSpec = {
  label: "Highlight — row's gender color ({{text}})",
  action: { kind: "wrap", before: "{{", after: "}}" },
  Icon: Highlighter,
};

const STRUCTURE_BUTTONS: ButtonSpec[] = [
  {
    label: "Heading (# text)",
    action: { kind: "linePrefix", prefix: "# " },
    Icon: Heading,
  },
  {
    label: "Bullet list (- item)",
    action: { kind: "linePrefix", prefix: "- " },
    Icon: List,
  },
  {
    label: "Numbered list (1. item)",
    action: { kind: "orderedList" },
    Icon: ListOrdered,
  },
  {
    label: "Link ([text](url))",
    action: { kind: "link" },
    Icon: LinkIcon,
  },
  {
    label: "Table (insert pipe-table template)",
    action: { kind: "table" },
    Icon: TableIcon,
  },
];

const CLEAR_BUTTON: ButtonSpec = {
  label: "Clear formatting",
  action: { kind: "clear" },
  Icon: Eraser,
};

export function MarkerToolbar({
  onAction,
  onMouseDown,
  variant = "multi",
  className,
}: MarkerToolbarProps) {
  const renderBtn = (spec: ButtonSpec, key: string) => (
    <Tooltip key={key} label={spec.label}>
      <button
        type="button"
        // Prevent textarea blur on mousedown; click still fires.
        onMouseDown={(e) => {
          e.preventDefault();
          onMouseDown?.();
        }}
        onClick={(e) => {
          e.preventDefault();
          onAction(spec.action);
        }}
        className="flex h-8 min-w-[32px] items-center justify-center rounded px-1.5 text-xs-medium hover:bg-bone-hover"
        style={spec.color ? { color: spec.color } : undefined}
      >
        {spec.Icon ? (
          <spec.Icon className="h-4 w-4" />
        ) : (
          <span className="font-bold leading-none">{spec.glyph}</span>
        )}
      </button>
    </Tooltip>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-md",
        className,
      )}
      onMouseDown={(e) => {
        // Clicks on padding shouldn't blur textarea either
        e.preventDefault();
        onMouseDown?.();
      }}
    >
      {FORMAT_BUTTONS.map((spec, i) => renderBtn(spec, `f${i}`))}
      <div className="mx-1 h-5 w-px bg-gray-200" />
      {variant === "word"
        ? renderBtn(HIGHLIGHT_BUTTON, "hl")
        : COLOR_BUTTONS.map((spec, i) => renderBtn(spec, `c${i}`))}
      <div className="mx-1 h-5 w-px bg-gray-200" />
      {STRUCTURE_BUTTONS.map((spec, i) => renderBtn(spec, `s${i}`))}
      <div className="mx-1 h-5 w-px bg-gray-200" />
      {renderBtn(CLEAR_BUTTON, "clr")}
    </div>
  );
}
