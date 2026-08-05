/**
 * Word data for the auto-playing landing-page demo (concepts C & D).
 * Real course words — assets copied locally from the word-images / word-audio
 * buckets so the marketing pages have no runtime Supabase dependency.
 * Trio chosen from the Notion "GOOD PICS FOR PROMOS" picks: a feminine noun,
 * a masculine noun with a recurring famous face, and a verb.
 */

export interface DemoTriggerSegment {
  text: string;
  /** Sound-alike part of the trigger — rendered highlighted. */
  highlight?: boolean;
}

export interface DemoWord {
  headword: string;
  english: string;
  gender: "f" | "m" | null;
  /** Approximate pronunciation shown alongside the headword. */
  phonetic: string;
  trigger: DemoTriggerSegment[];
  image: string;
  audio: string;
  alt: string;
}

export const DEMO_WORDS: DemoWord[] = [
  {
    headword: "la fragola",
    english: "strawberry",
    gender: "f",
    phonetic: "frah-go-lah",
    trigger: [
      { text: "Kicking a strawberry, the female " },
      { text: "FROG", highlight: true },
      { text: " scores a " },
      { text: "GOAL", highlight: true },
      { text: " — a " },
      { text: "FROG-GOAL-AAHH!", highlight: true },
    ],
    image: "/marketing/demo/fragola.png",
    audio: "/marketing/demo/fragola.mp3",
    alt: "Cartoon of a female frog in football kit scoring a goal with a strawberry",
  },
  {
    headword: "il tegame",
    english: "pan",
    gender: "m",
    phonetic: "teh-gah-meh",
    trigger: [
      { text: "MR T", highlight: true },
      { text: " uses a pan to play the " },
      { text: "TEA GAME", highlight: true },
      { text: "." },
    ],
    image: "/marketing/demo/tegame.png",
    audio: "/marketing/demo/tegame.mp3",
    alt: "Cartoon of Mr T drinking tea brewed in a huge frying pan",
  },
  {
    headword: "nuotare",
    english: "to swim",
    gender: null,
    phonetic: "nwo-tah-reh",
    trigger: [
      { text: "Swimming at sunset in a " },
      { text: "NEW TYRE", highlight: true },
      { text: "." },
    ],
    image: "/marketing/demo/nuotare.png",
    audio: "/marketing/demo/nuotare.mp3",
    alt: "Cartoon of a man swimming in the sea inside a new tyre",
  },
];

/** Extra real cartoons for Concept D's word wall (image-only). */
export const WALL_WORDS: { headword: string; english: string; gender: "f" | "m" | null; image: string; alt: string }[] = [
  { headword: "il letto", english: "bed", gender: "m", image: "/marketing/demo/letto.png", alt: "Cartoon for il letto — bed" },
  { headword: "la mosca", english: "fly", gender: "f", image: "/marketing/demo/mosca.png", alt: "Cartoon for la mosca — fly" },
  { headword: "la pecora", english: "sheep", gender: "f", image: "/marketing/demo/pecora.png", alt: "Cartoon for la pecora — sheep" },
  { headword: "il recinto", english: "fence", gender: "m", image: "/marketing/demo/recinto.png", alt: "Cartoon for il recinto — fence" },
  { headword: "la padella", english: "frying pan", gender: "f", image: "/marketing/demo/padella.png", alt: "Cartoon for la padella — frying pan" },
  { headword: "il calzino", english: "sock", gender: "m", image: "/marketing/demo/calzino.png", alt: "Cartoon for il calzino — sock" },
];
