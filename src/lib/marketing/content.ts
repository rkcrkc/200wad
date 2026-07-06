/**
 * Marketing content data — single source for the marketing site so the nav,
 * homepage, language hubs and footer stay in sync. Copy here is the v1 draft
 * per docs/MARKETING_SITE_ARCHITECTURE.md (companion positioning).
 */

export interface MarketingLanguage {
  slug: string;
  name: string;
  /** Adjective form used in copy, e.g. "Spanish vocab". */
  flag: string;
  /** Published course count (live data — see docs/MARKETING_SITE_ARCHITECTURE.md). */
  courseCount: number;
  /** Approximate published lesson count, rounded down for display. */
  lessonCount: number;
  /** Approximate distinct word count, rounded down for display. */
  wordCount: number;
  /** One-line hub blurb. */
  blurb: string;
}

/** Order drives the auto-rotating hero word. */
export const MARKETING_LANGUAGES: MarketingLanguage[] = [
  {
    slug: "french",
    name: "French",
    flag: "🇫🇷",
    courseCount: 5,
    lessonCount: 430,
    wordCount: 3800,
    blurb: "Over 3,800 French words across 430+ lessons — vocab, sentences and proverbs, each with a memory trigger that sticks.",
  },
  {
    slug: "spanish",
    name: "Spanish",
    flag: "🇪🇸",
    courseCount: 5,
    lessonCount: 440,
    wordCount: 3800,
    blurb: "3,800+ Spanish words with memory triggers, native audio and spaced testing across 440+ lessons.",
  },
  {
    slug: "german",
    name: "German",
    flag: "🇩🇪",
    courseCount: 5,
    lessonCount: 500,
    wordCount: 4100,
    blurb: "4,100+ German words in 500+ bite-sized lessons, built for long-term recall from beginner to advanced.",
  },
  {
    slug: "italian",
    name: "Italian",
    flag: "🇮🇹",
    courseCount: 4,
    lessonCount: 700,
    wordCount: 11900,
    blurb: "Our biggest course: 11,900+ Italian words across 700+ lessons, from first words to grammar and proverbs.",
  },
];

/**
 * Course families every language is built around — the progression from first
 * words to native-sounding fluency. Universally available across all four
 * languages (Italian additionally has dedicated Grammar & Sentence Builder).
 */
export const COURSE_FAMILIES: { name: string; level: string; body: string }[] = [
  {
    name: "Vocabulary — Beginner",
    level: "Start here",
    body: "The essential everyday words, each paired with its own vivid memory trigger and native audio.",
  },
  {
    name: "Vocabulary — Intermediate",
    level: "Level up",
    body: "Push past the basics into the higher-value words that move you toward real fluency.",
  },
  {
    name: "Sentences",
    level: "Put it together",
    body: "Combine the words you know into natural phrases and full sentences you'd actually say.",
  },
  {
    name: "Proverbs",
    level: "Sound native",
    body: "101 authentic sayings per language to round off your fluency and sound like a local.",
  },
];

/** Everyday topics covered across the vocabulary courses. */
export const TOPICS: string[] = [
  "Food & drink",
  "Family & people",
  "Travel & directions",
  "Numbers & time",
  "Home & everyday life",
  "Work & school",
  "Shopping & money",
  "Health & the body",
  "Nature & animals",
  "Verbs & adjectives",
];

export function getLanguage(slug: string): MarketingLanguage | undefined {
  return MARKETING_LANGUAGES.find((l) => l.slug === slug);
}

/** Products/methods we complement — the "plays well with" strip. */
export const COMPANION_PRODUCTS: { name: string; note: string }[] = [
  { name: "Duolingo", note: "Remember the words it teaches you" },
  { name: "Babbel", note: "Lock in the vocab between lessons" },
  { name: "Pimsleur", note: "Turn listening into lasting recall" },
  { name: "Your class", note: "The vocab homework that sticks" },
  { name: "A tutor", note: "Practice words between sessions" },
  { name: "Immersion", note: "Bank the words you meet in the wild" },
];

/** The three-step method. */
export const METHOD_STEPS: { title: string; body: string }[] = [
  {
    title: "Study with memory triggers",
    body: "Every word comes with a vivid image or short clip plus native audio — associations your brain actually holds onto, not another list to grind.",
  },
  {
    title: "Test yourself",
    body: "Type the answer and get honest, character-level feedback so you see exactly what you got wrong. Clues are there if you want them.",
  },
  {
    title: "Earn mastery",
    body: "Get a word perfect three times in a row and it's marked mastered. Proof you actually know it — earned, not handed over for showing up.",
  },
];

/** Word-progress states, used to visualise "earned mastery". */
export const MASTERY_STATES: { label: string; note: string }[] = [
  { label: "Not started", note: "Haven't met it yet" },
  { label: "Learning", note: "Seen it in a study session" },
  { label: "Learned", note: "Got it right under test" },
  { label: "Mastered", note: "Perfect three times in a row" },
];

export const MARKETING_FAQS: { q: string; a: string }[] = [
  {
    q: "Do I have to stop using Duolingo or my class?",
    a: "No — that's the whole point. 200 Words a Day is the memory layer that sits alongside whatever you already use. Keep your app, keep your class; we make the vocabulary stick.",
  },
  {
    q: "How is this different from flashcards?",
    a: "Flashcards show you a word and hope it lands. We pair every word with a memory trigger (image or clip) and native audio, then test recall with honest feedback and a mastery streak — so words move into long-term memory instead of being forgotten by tomorrow.",
  },
  {
    q: "What does “mastered” actually mean?",
    a: "A word is only marked mastered after you answer it perfectly three tests in a row — no mistakes, no clues. It's a real signal you'll still know it months from now, not a participation badge.",
  },
  {
    q: "Which languages can I learn?",
    a: "French, Spanish, German and Italian, each with multiple courses covering vocabulary, sentences and grammar.",
  },
  {
    q: "Is it really free to start?",
    a: "Yes. The first 10 lessons of any course are free, no card required. Subscribe only when you want to keep going.",
  },
  {
    q: "How much time does it take?",
    a: "It's built for short, daily sessions — a few minutes is enough to keep your streak and steadily bank new words. Do more when you feel like it.",
  },
];

export const MARKETING_STATS = {
  learners: "20,000+",
  languages: 4,
  freeLessons: 10,
  /** Live catalogue totals (rounded down) — verified against published courses. */
  courses: 19,
  lessons: "2,000+",
  words: "23,000+",
  /** CEFR-style span across the course families. */
  levelRange: "Beginner to advanced",
};
