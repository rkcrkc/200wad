"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MarkerToolbar, type MarkerAction } from "./MarkerToolbar";

interface BodyTextEditorProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "onChange" | "value"
  > {
  value: string;
  onChange: (value: string) => void;
  /** Wrapper div className (controls outer layout/sizing). */
  wrapperClassName?: string;
  /** Textarea className override. Defaults to admin-textarea styling. */
  textareaClassName?: string;
  /** Toolbar variant — "word" (single-gender) or "multi" (multi-gender). */
  variant?: "word" | "multi";
}

// Style props copied to the mirror div used for caret coordinate measurement.
const STYLE_PROPS = [
  "boxSizing",
  "width",
  "height",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "whiteSpace",
  "wordWrap",
  "wordBreak",
] as const;

interface CaretRect {
  top: number;
  left: number;
  height: number;
}

/**
 * Compute pixel coordinates of a character offset in a textarea by mirroring
 * its content and styles into a hidden div, then measuring the offset of a
 * marker span placed at that position. Returns coordinates relative to the
 * textarea's outer top-left (i.e. includes its borders + padding).
 */
function getCaretRect(
  textarea: HTMLTextAreaElement,
  position: number,
): CaretRect {
  const div = document.createElement("div");
  const cs = window.getComputedStyle(textarea);
  for (const prop of STYLE_PROPS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (div.style as any)[prop] = (cs as any)[prop];
  }
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflow = "hidden";
  div.style.top = "0";
  div.style.left = "-9999px";

  const before = textarea.value.substring(0, position);
  // Trailing newline gets collapsed in some browsers — append a space placeholder.
  div.textContent = before.endsWith("\n") ? `${before} ` : before;

  const span = document.createElement("span");
  span.textContent = "|";
  div.appendChild(span);
  document.body.appendChild(div);

  const rect: CaretRect = {
    top: span.offsetTop,
    left: span.offsetLeft,
    height: span.offsetHeight || parseFloat(cs.lineHeight) || 16,
  };
  document.body.removeChild(div);
  return rect;
}

/**
 * Strip all parseFormattedText markers from a string. Iterative to handle
 * nested structures (e.g. `<u>{{m|**Hi**}}</u>` → `Hi`).
 */
function stripFormatting(input: string): string {
  let prev: string;
  let out = input;
  do {
    prev = out;
    out = out
      // {{tag|content}} or {{content}} → content
      .replace(/\{\{(?:[^|}]+\|)?([^}]+)\}\}/g, "$1")
      // **bold** → bold
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      // *italic* → italic
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1$2")
      // <u>...</u> → ...
      .replace(/<u>([\s\S]*?)<\/u>/g, "$1")
      // [text](url) → text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  } while (out !== prev);
  // Strip line-prefix markers (heading, bullet, numbered).
  out = out
    .split("\n")
    .map((line) =>
      line
        .replace(/^[ \t]*#{1,3}[ \t]+/, "")
        .replace(/^[ \t]*[-+][ \t]+/, "")
        .replace(/^[ \t]*\d+\.[ \t]+/, ""),
    )
    .join("\n");
  return out;
}

export function BodyTextEditor({
  value,
  onChange,
  wrapperClassName,
  textareaClassName,
  rows = 8,
  variant,
  ...rest
}: BodyTextEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const closeOnBlurRef = useRef(true);

  const updatePos = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setPos(null);
      return;
    }
    const caret = getCaretRect(ta, start);
    setPos({
      top: caret.top - ta.scrollTop,
      left: caret.left - ta.scrollLeft,
    });
  }, []);

  // Listen to selectionchange so toolbar reacts even when selection shifts via keyboard.
  useEffect(() => {
    const handler = () => {
      const ta = taRef.current;
      if (!ta) return;
      if (document.activeElement !== ta) return;
      updatePos();
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [updatePos]);

  const applyAction = useCallback(
    (action: MarkerAction) => {
      const ta = taRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const sel = ta.value.substring(start, end);

      switch (action.kind) {
        case "wrap": {
          if (start === end) return;
          const next =
            ta.value.substring(0, start) +
            action.before +
            sel +
            action.after +
            ta.value.substring(end);
          onChange(next);
          requestAnimationFrame(() => {
            ta.focus();
            const newStart = start + action.before.length;
            const newEnd = newStart + sel.length;
            ta.setSelectionRange(newStart, newEnd);
            updatePos();
          });
          return;
        }
        case "linePrefix": {
          // Expand selection to full lines, then prefix each non-empty line.
          const lineStart = ta.value.lastIndexOf("\n", start - 1) + 1;
          const nextNewline = ta.value.indexOf("\n", end);
          const lineEnd = nextNewline === -1 ? ta.value.length : nextNewline;
          const block = ta.value.substring(lineStart, lineEnd);
          const transformed = block
            .split("\n")
            .map((l) => (l.length > 0 ? `${action.prefix}${l}` : l))
            .join("\n");
          const next =
            ta.value.substring(0, lineStart) +
            transformed +
            ta.value.substring(lineEnd);
          onChange(next);
          requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(lineStart, lineStart + transformed.length);
            updatePos();
          });
          return;
        }
        case "orderedList": {
          const lineStart = ta.value.lastIndexOf("\n", start - 1) + 1;
          const nextNewline = ta.value.indexOf("\n", end);
          const lineEnd = nextNewline === -1 ? ta.value.length : nextNewline;
          const block = ta.value.substring(lineStart, lineEnd);
          let counter = 1;
          const transformed = block
            .split("\n")
            .map((l) => (l.length > 0 ? `${counter++}. ${l}` : l))
            .join("\n");
          const next =
            ta.value.substring(0, lineStart) +
            transformed +
            ta.value.substring(lineEnd);
          onChange(next);
          requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(lineStart, lineStart + transformed.length);
            updatePos();
          });
          return;
        }
        case "link": {
          // If selection exists: wrap as [sel](url), select the literal "url".
          // If no selection: insert [text](url), select "text".
          const linkText = sel || "text";
          const placeholder = "url";
          const inserted = `[${linkText}](${placeholder})`;
          const next =
            ta.value.substring(0, start) + inserted + ta.value.substring(end);
          onChange(next);
          requestAnimationFrame(() => {
            ta.focus();
            if (sel) {
              // Select "url" — cursor lands inside the parens
              const urlStart = start + 1 + linkText.length + 2; // [ + text + ](
              ta.setSelectionRange(urlStart, urlStart + placeholder.length);
            } else {
              // Select "text" — author types the link label first
              const textStart = start + 1; // after [
              ta.setSelectionRange(textStart, textStart + linkText.length);
            }
            updatePos();
          });
          return;
        }
        case "table": {
          // Insert a 2-column × 2-row pipe-table template. Cursor is placed
          // inside the first header cell so the author can immediately type.
          // If we're mid-line, insert a leading newline so the table starts on
          // its own line.
          const needsLeadingNewline =
            start > 0 && ta.value[start - 1] !== "\n";
          const lead = needsLeadingNewline ? "\n" : "";
          const template =
            "| Header 1 | Header 2 |\n| --- | --- |\n| Cell A | Cell B |\n| Cell C | Cell D |\n";
          const inserted = lead + template;
          const next =
            ta.value.substring(0, start) + inserted + ta.value.substring(end);
          onChange(next);
          requestAnimationFrame(() => {
            ta.focus();
            // Select the literal "Header 1" text inside the first header cell.
            const headerLabel = "Header 1";
            const headerOffset = lead.length + 2; // skip "| "
            const selStart = start + headerOffset;
            ta.setSelectionRange(selStart, selStart + headerLabel.length);
            updatePos();
          });
          return;
        }
        case "clear": {
          if (start === end) return;
          const cleaned = stripFormatting(sel);
          const next =
            ta.value.substring(0, start) + cleaned + ta.value.substring(end);
          onChange(next);
          requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(start, start + cleaned.length);
            updatePos();
          });
          return;
        }
      }
    },
    [onChange, updatePos],
  );

  // Toolbar is roughly 40px tall. If selection is near the top, flip it below.
  const TOOLBAR_HEIGHT = 44;
  const showAbove = (pos?.top ?? 0) >= TOOLBAR_HEIGHT;
  const lineHeight = 22;
  const toolbarStyle = pos
    ? {
        top: showAbove
          ? Math.max(0, pos.top - TOOLBAR_HEIGHT)
          : pos.top + lineHeight + 4,
        left: Math.max(0, pos.left - 8),
      }
    : undefined;

  return (
    <div className={cn("relative", wrapperClassName)}>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onMouseUp={updatePos}
        onKeyUp={updatePos}
        onSelect={updatePos}
        onScroll={() => {
          if (pos) updatePos();
        }}
        onBlur={() => {
          // Defer so toolbar mousedown handlers can cancel before we hide it.
          window.setTimeout(() => {
            if (closeOnBlurRef.current) setPos(null);
          }, 150);
        }}
        rows={rows}
        className={cn(
          "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-colors",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          "min-h-[120px] resize-y",
          textareaClassName,
        )}
        {...rest}
      />
      {pos && (
        <div className="pointer-events-auto absolute z-30" style={toolbarStyle}>
          <MarkerToolbar
            onAction={applyAction}
            variant={variant}
            onMouseDown={() => {
              closeOnBlurRef.current = false;
              window.setTimeout(() => {
                closeOnBlurRef.current = true;
              }, 200);
            }}
          />
        </div>
      )}
    </div>
  );
}
