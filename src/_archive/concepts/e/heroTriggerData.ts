/**
 * Hero memory-trigger cards for Concept E, grouped by language tab.
 *
 * Card format (from RC's spec):
 *   The word for {english} is… {headword} which sounds like {soundsLike}.
 *   So just imagine… {imagine} {image}
 *   (The {genderObject} lets you know the word is feminine/masculine.)
 *
 * Italian is populated from the real demo assets (fragola/tegame/nuotare).
 * French, Spanish and German tabs are present but empty — RC will supply the
 * words/triggers/art, at which point their `cards` arrays get filled in.
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
  /** Single foreign-pronunciation clip (legacy; still used by Concept E). */
  audio?: string;
  /**
   * Per-step audio for the auto-play sequence (Concept F): English word, then
   * foreign word, then memory trigger — mirroring the real study flow.
   * `audioForeign` points at the real pronunciation mp3s; `audioEnglish` and
   * `audioTrigger` are seeded to a naming convention and stay silent until the
   * clips are recorded (playback fails silently if the file is missing).
   * TODO(RC): record `<id>-en.mp3` and `<id>-trigger.mp3` for each word.
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

export const HERO_LANGUAGES: HeroLanguageTab[] = [
  {
    slug: "french",
    name: "French",
    flag: "🇫🇷",
    // TODO(RC): supply 3 French words + triggers + art to populate this tab.
    cards: [],
  },
  {
    slug: "spanish",
    name: "Spanish",
    flag: "🇪🇸",
    // TODO(RC): supply 3 Spanish words + triggers + art.
    cards: [],
  },
  {
    slug: "german",
    name: "German",
    flag: "🇩🇪",
    // TODO(RC): supply 3 German words + triggers + art.
    cards: [],
  },
  {
    slug: "italian",
    name: "Italian",
    flag: "🇮🇹",
    cards: [
      {
        id: "fragola",
        english: "strawberry",
        headword: "la fragola",
        phonetic: "frah-go-lah",
        soundsLike: "frog + goal",
        imagine:
          "A female frog boots a strawberry into the top corner and screams FROG-GOAL-AAHH!",
        image: "/marketing/demo/fragola.png",
        audio: "/marketing/demo/fragola.mp3",
        audioEnglish: "/marketing/demo/fragola-en.mp3",
        audioForeign: "/marketing/demo/fragola.mp3",
        audioTrigger: "/marketing/demo/fragola-trigger.mp3",
        alt: "Cartoon of a female frog in football kit scoring a goal with a strawberry",
        gender: "f",
        genderObject: "female frog",
        sentence: "Mangio una fragola dolce.",
        sentenceEnglish: "I'm eating a sweet strawberry.",
      },
      {
        id: "tegame",
        english: "pan",
        headword: "il tegame",
        phonetic: "teh-gah-meh",
        soundsLike: "T + game",
        imagine: "Mr T brews a cuppa in a giant pan to win the TEA GAME.",
        image: "/marketing/demo/tegame.png",
        audio: "/marketing/demo/tegame.mp3",
        audioEnglish: "/marketing/demo/tegame-en.mp3",
        audioForeign: "/marketing/demo/tegame.mp3",
        audioTrigger: "/marketing/demo/tegame-trigger.mp3",
        alt: "Cartoon of Mr T drinking tea brewed in a huge frying pan",
        gender: "m",
        genderObject: "Mr T",
        sentence: "Il tegame è sul fuoco.",
        sentenceEnglish: "The pan is on the heat.",
      },
      {
        id: "nuotare",
        english: "to swim",
        headword: "nuotare",
        phonetic: "nwo-tah-reh",
        soundsLike: "new tyre",
        imagine: "You bob about at sunset, swimming inside a big NEW TYRE.",
        image: "/marketing/demo/nuotare.png",
        audio: "/marketing/demo/nuotare.mp3",
        audioEnglish: "/marketing/demo/nuotare-en.mp3",
        audioForeign: "/marketing/demo/nuotare.mp3",
        audioTrigger: "/marketing/demo/nuotare-trigger.mp3",
        alt: "Cartoon of a man swimming in the sea inside a new tyre",
        gender: null,
        sentence: "Mi piace nuotare al mare.",
        sentenceEnglish: "I like to swim in the sea.",
      },
    ],
  },
];
