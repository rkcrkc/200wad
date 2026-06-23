"use client";

import { useEffect } from "react";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";

/**
 * Windows' system emoji font (Segoe UI Emoji) renders flag emoji as the
 * two-letter country code (e.g. "DE") instead of an actual flag. This injects
 * the "Twemoji Country Flags" web font, but only on platforms that need it, so
 * flag emoji render consistently. The font name is prepended to the body font
 * stack in globals.css; it only contains flag glyphs, so all other text falls
 * through to Inter.
 */
export function FlagEmojiPolyfill() {
  useEffect(() => {
    polyfillCountryFlagEmojis();
  }, []);

  return null;
}
