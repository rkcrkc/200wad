"use client";

import React from "react";
import {
  genderColor,
  genderColorDark,
  defaultHighlightColor,
  defaultHighlightColorDark,
} from "@/lib/design-tokens";

interface GenderedHeadwordProps {
  /** The foreign headword, e.g. "l'adolescent (m) / l'adolescente (f)". */
  text: string;
  /** Word gender: m/f/n/mn colour the whole word; mf is split or gradient. */
  gender?: string | null;
  /** Foreign audio is playing — use the darker gender shades. */
  isPlaying?: boolean;
  className?: string;
}

/** Neutral text colour for the " / " divider between two gendered forms. */
const DIVIDER_COLOR = "#141515";
const DIVIDER_COLOR_DARK = "#3a3a3a";

/** Single flat colour for non-mf words (m/f/n/mn), matching legacy behaviour. */
function singleColor(gender: string | null | undefined, isPlaying: boolean): string {
  const table = isPlaying ? genderColorDark : genderColor;
  if (gender && gender in table) return table[gender];
  return isPlaying ? defaultHighlightColorDark : defaultHighlightColor;
}

/**
 * Colour for one side of a split "masc / fem" headword. Prefers an explicit
 * (m)/(f)/(n) marker, then a leading article, then falls back to position
 * (first side masculine, second feminine).
 */
function segmentColor(segment: string, index: number, isPlaying: boolean): string {
  const s = segment.toLowerCase();
  const masc = isPlaying ? genderColorDark.m : genderColor.m;
  const fem = isPlaying ? genderColorDark.f : genderColor.f;
  const neu = isPlaying ? genderColorDark.n : genderColor.n;
  if (/\(m\)/.test(s)) return masc;
  if (/\(f\)/.test(s)) return fem;
  if (/\(n\)/.test(s)) return neu;
  if (/^\s*(le|el|il|lo|der|un|uno)\b/.test(s)) return masc;
  if (/^\s*(la|une|una|die)\b/.test(s)) return fem;
  if (/^\s*das\b/.test(s)) return neu;
  return index === 0 ? masc : fem;
}

/**
 * Renders a foreign headword with gender-aware colouring:
 *   - non-mf (m/f/n/mn) → one flat gender colour (legacy behaviour);
 *   - mf with two forms split by " / " → masculine side blue, feminine red,
 *     divider neutral (e.g. "l'adolescent (m) / l'adolescente (f)");
 *   - mf single form (combined article, "(m/f)" tag, or bare noun) →
 *     a blue→red gradient across the word.
 */
export function GenderedHeadword({
  text,
  gender,
  isPlaying = false,
  className,
}: GenderedHeadwordProps) {
  if (gender !== "mf") {
    return (
      <span className={className} style={{ color: singleColor(gender, isPlaying) }}>
        {text}
      </span>
    );
  }

  // Two distinct forms → colour each side independently.
  if (text.includes(" / ")) {
    const parts = text.split(" / ");
    const divider = isPlaying ? DIVIDER_COLOR_DARK : DIVIDER_COLOR;
    return (
      <span className={className}>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: divider }}> / </span>}
            <span style={{ color: segmentColor(part, i, isPlaying) }}>{part}</span>
          </React.Fragment>
        ))}
      </span>
    );
  }

  // Single mf form → blue→red gradient.
  const from = isPlaying ? genderColorDark.m : genderColor.m;
  const to = isPlaying ? genderColorDark.f : genderColor.f;
  return (
    <span
      className={className}
      style={{
        // inline-block establishes a box so -webkit-background-clip: text
        // reliably clips the gradient to the glyphs across browsers.
        display: "inline-block",
        backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
      }}
    >
      {text}
    </span>
  );
}
