/**
 * Section 5 · The Solution card data. Reuses the exact same real 200WAD word
 * content as the hero (HERO_LANGUAGES_G), but flattened into one mixed deck of 10
 * cards drawn round-robin across the four languages, so the carousel shows a
 * cross-language sampler rather than one language at a time. Each card carries its
 * language's flag + name so the (self-contained, per-card) type-the-answer bar can
 * label which language the learner is answering in.
 */
import { type HeroTriggerCard } from "./heroTriggerTypes";
import { HERO_LANGUAGES_G } from "./heroDemoData";

export type SolutionCardData = HeroTriggerCard & { flag: string; langName: string };

/** Interleave the language decks (fr, es, de, it, fr, es, …) and take the first 10. */
function buildDeck(limit: number): SolutionCardData[] {
  const deck: SolutionCardData[] = [];
  const maxLen = Math.max(...HERO_LANGUAGES_G.map((l) => l.cards.length));
  for (let row = 0; row < maxLen && deck.length < limit; row++) {
    for (const lang of HERO_LANGUAGES_G) {
      const card = lang.cards[row];
      if (!card) continue;
      deck.push({ ...card, flag: lang.flag, langName: lang.name });
      if (deck.length >= limit) break;
    }
  }
  return deck;
}

export const SOLUTION_CARDS: SolutionCardData[] = buildDeck(10);
