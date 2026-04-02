/**
 * Dead key composition for accented character input.
 *
 * On Windows without US International keyboard layout, the shortcuts shown
 * in the accented characters panel (e.g. ' + e = é) don't work natively.
 * This module implements app-level dead key composition so those shortcuts
 * work directly in the answer input fields.
 *
 * Behaviour mirrors US International:
 *   - Press dead key prefix (', `, ", ^, ~) → nothing visible yet
 *   - Press a composable character → accented character appears
 *   - Press the same dead key again → literal dead key character
 *   - Press Space → literal dead key character
 *   - Press any non-composable character → both characters appear
 *
 * Compositions are filtered by the current language's accent set so that
 * e.g. in Italian, ' + a does NOT compose (Italian uses à not á), which
 * avoids conflicts with apostrophe elision (l'aeroporto).
 */

import { useMemo, useCallback, useRef, type RefObject, type KeyboardEvent } from "react";

/** Accented characters per language (canonical source, shared with StudyActionBar) */
export const ACCENTED_CHARACTERS: Record<string, string[]> = {
  fr: ["à", "â", "æ", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "œ", "ù", "û", "ü", "ÿ"],
  de: ["ä", "ö", "ü", "ß"],
  it: ["à", "è", "é", "ì", "ò", "ó", "ù"],
  es: ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡"],
  cy: ["â", "ê", "î", "ô", "û", "ŵ", "ŷ"],
};

/** Full dead key composition map: prefix → base char → composed result */
const FULL_COMPOSITION_MAP: Record<string, Record<string, string>> = {
  "'": { a: "á", e: "é", i: "í", o: "ó", u: "ú", c: "ç" },
  "`": { a: "à", e: "è", i: "ì", o: "ò", u: "ù" },
  '"': { a: "ä", e: "ë", i: "ï", o: "ö", u: "ü", y: "ÿ" },
  "^": { a: "â", e: "ê", i: "î", o: "ô", u: "û", w: "ŵ", y: "ŷ" },
  "~": { n: "ñ" },
};

/**
 * Build a composition map filtered to only produce characters present in
 * the given language's accent set.
 */
export function getLanguageCompositionMap(
  languageCode?: string | null
): Record<string, Record<string, string>> {
  if (!languageCode || !(languageCode in ACCENTED_CHARACTERS)) return {};

  const accentSet = new Set(ACCENTED_CHARACTERS[languageCode]);
  const filtered: Record<string, Record<string, string>> = {};

  for (const [prefix, map] of Object.entries(FULL_COMPOSITION_MAP)) {
    const filteredMap: Record<string, string> = {};
    for (const [base, result] of Object.entries(map)) {
      if (accentSet.has(result)) {
        filteredMap[base] = result;
      }
    }
    if (Object.keys(filteredMap).length > 0) {
      filtered[prefix] = filteredMap;
    }
  }

  return filtered;
}

/**
 * Hook for dead key composition in controlled text inputs.
 *
 * Call `handleDeadKey(e)` at the top of onKeyDown — if it returns `true`,
 * the key was consumed by the dead key system and should not be processed
 * further (e.g. don't also handle Enter-to-submit).
 *
 * Call `clearPending()` when resetting the input (word change, external
 * character insertion, etc.).
 */
export function useDeadKeyComposition(
  languageCode: string | null | undefined,
  inputRef: RefObject<HTMLInputElement | null>,
  setInputValue: (value: string) => void,
) {
  const pendingRef = useRef<string | null>(null);

  const compositionMap = useMemo(
    () => getLanguageCompositionMap(languageCode),
    [languageCode]
  );

  const clearPending = useCallback(() => {
    pendingRef.current = null;
  }, []);

  const handleDeadKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): boolean => {
      // If the OS handles dead keys natively (Mac, Windows US-Intl), don't interfere
      if (e.key === "Dead") return false;

      // No compositions for this language → nothing to do
      if (Object.keys(compositionMap).length === 0) return false;

      const pending = pendingRef.current;
      const key = e.key;
      const el = inputRef.current;
      if (!el) return false;

      const insertAtCursor = (text: string) => {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const newValue = el.value.slice(0, start) + text + el.value.slice(end);
        setInputValue(newValue);
        requestAnimationFrame(() => {
          el.setSelectionRange(start + text.length, start + text.length);
        });
      };

      // ── Resolve pending dead key ──────────────────────────────────
      if (pending) {
        // Special / non-character keys (Enter, Backspace, etc.):
        // discard pending dead key, let the key through normally
        if (key.length > 1) {
          pendingRef.current = null;
          return false;
        }

        e.preventDefault();

        if (key === pending || key === " ") {
          // Same prefix again or Space → output literal prefix character
          insertAtCursor(pending);
        } else {
          const composed = compositionMap[pending]?.[key.toLowerCase()];
          if (composed) {
            insertAtCursor(composed);
          } else {
            // Non-composable → output both characters
            insertAtCursor(pending + key);
          }
        }
        pendingRef.current = null;
        return true;
      }

      // ── Start new dead key sequence ───────────────────────────────
      if (key in compositionMap) {
        // Heuristic: ' or " immediately after a letter is likely an
        // apostrophe / quotation mark, not a dead key prefix.
        // This prevents l'erba → lé in Italian.
        if (key === "'" || key === '"') {
          const start = el.selectionStart ?? 0;
          if (start > 0) {
            const charBefore = el.value[start - 1];
            if (/[a-zA-Z\u00C0-\u024F]/.test(charBefore)) {
              return false; // Let through as literal character
            }
          }
        }
        e.preventDefault();
        pendingRef.current = key;
        return true;
      }

      return false;
    },
    [compositionMap, inputRef, setInputValue]
  );

  return { handleDeadKey, clearPending };
}
