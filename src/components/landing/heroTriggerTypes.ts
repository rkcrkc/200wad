/**
 * Types for the hero memory-trigger cards used by the Landing page's HeroDemo.
 *
 * Card format:
 *   The word for {english} is… {headword} which sounds like {soundsLike}.
 *   So just imagine… {imagine} {image}
 *   (The {genderObject} lets you know the word is feminine/masculine.)
 */

export interface HeroTriggerCard {
  id: string;
  /** English meaning — "The word for {english} is…". */
  english: string;
  /** Foreign headword, including its article where relevant. */
  headword: string;
  /** Pronunciation aid. */
  phonetic: string;
  /** English sound-alike — "which sounds like {soundsLike}". */
  soundsLike: string;
  /** The memory-trigger scene — "So just imagine… {imagine}". */
  imagine: string;
  image: string;
  /** Single foreign-pronunciation clip (legacy). */
  audio?: string;
  /**
   * Per-step audio for the auto-play sequence: English word, then foreign word,
   * then memory trigger — mirroring the real study flow. Playback fails silently
   * if a clip is missing.
   */
  audioEnglish?: string;
  audioForeign?: string;
  audioTrigger?: string;
  alt: string;
  gender: "f" | "m" | null;
  /** The character/object that signals the gender, e.g. "female frog". */
  genderObject?: string;
  /** Example sentence to reinforce the meaning. */
  sentence?: string;
  sentenceEnglish?: string;
}

export interface HeroLanguageTab {
  slug: string;
  name: string;
  flag: string;
  cards: HeroTriggerCard[];
}
