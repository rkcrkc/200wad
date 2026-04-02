"use client";

import { useRef, useCallback } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: boolean;
}

type FormatAction =
  | { type: "wrap"; before: string; after: string }
  | { type: "line-prefix"; prefix: string }
  | { type: "link" };

const TOOLBAR_ITEMS: { icon: React.ElementType; label: string; action: FormatAction }[] = [
  { icon: Heading1, label: "Heading 1", action: { type: "line-prefix", prefix: "# " } },
  { icon: Heading2, label: "Heading 2", action: { type: "line-prefix", prefix: "## " } },
  { icon: Heading3, label: "Heading 3", action: { type: "line-prefix", prefix: "### " } },
  { icon: Bold, label: "Bold", action: { type: "wrap", before: "**", after: "**" } },
  { icon: Italic, label: "Italic", action: { type: "wrap", before: "*", after: "*" } },
  { icon: List, label: "Bullet list", action: { type: "line-prefix", prefix: "- " } },
  { icon: ListOrdered, label: "Numbered list", action: { type: "line-prefix", prefix: "1. " } },
  { icon: Link, label: "Link", action: { type: "link" } },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 8,
  error,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = useCallback(
    (action: FormatAction) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);

      let newValue: string;
      let cursorPos: number;

      if (action.type === "wrap") {
        const wrapped = `${action.before}${selected || "text"}${action.after}`;
        newValue = value.slice(0, start) + wrapped + value.slice(end);
        if (selected) {
          cursorPos = start + wrapped.length;
        } else {
          // Select the placeholder "text"
          cursorPos = start + action.before.length;
        }
      } else if (action.type === "line-prefix") {
        // Find the start of the current line
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = value.indexOf("\n", end);
        const actualEnd = lineEnd === -1 ? value.length : lineEnd;
        const lineContent = value.slice(lineStart, actualEnd);

        // Toggle: if line already starts with prefix, remove it
        if (lineContent.startsWith(action.prefix)) {
          newValue =
            value.slice(0, lineStart) +
            lineContent.slice(action.prefix.length) +
            value.slice(actualEnd);
          cursorPos = Math.max(lineStart, start - action.prefix.length);
        } else {
          // Remove other heading/list prefixes before adding new one
          const stripped = lineContent.replace(/^(#{1,3}\s|[-*]\s|\d+\.\s)/, "");
          newValue =
            value.slice(0, lineStart) +
            action.prefix +
            stripped +
            value.slice(actualEnd);
          cursorPos = lineStart + action.prefix.length + stripped.length;
        }
      } else {
        // link
        const linkText = selected || "link text";
        const link = `[${linkText}](url)`;
        newValue = value.slice(0, start) + link + value.slice(end);
        // Place cursor on "url" for easy replacement
        cursorPos = start + linkText.length + 3;
      }

      onChange(newValue);

      // Restore focus and cursor position after React re-renders
      requestAnimationFrame(() => {
        ta.focus();
        if (action.type === "wrap" && !selected) {
          // Select the placeholder word
          ta.setSelectionRange(cursorPos, cursorPos + 4);
        } else if (action.type === "link" && !selected) {
          // Select "url"
          ta.setSelectionRange(cursorPos, cursorPos + 3);
        } else {
          ta.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [value, onChange]
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white hover:border-gray-400"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        {TOOLBAR_ITEMS.map((item, i) => (
          <button
            key={item.label}
            type="button"
            onClick={() => applyFormat(item.action)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-colors hover:bg-white hover:text-gray-900",
              i === 3 && "ml-2",
              i === 5 && "ml-2"
            )}
            title={item.label}
          >
            <item.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y border-0 bg-transparent px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}
