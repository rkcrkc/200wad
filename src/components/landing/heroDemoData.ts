/**
 * Hero word-demo data for Concept G — now populated with the REAL 200WAD content
 * pulled from the app's Supabase database (words table). Each card uses the app's
 * actual English/headword/gender, its real memory-trigger copy, and its real
 * cartoon image + English/foreign/trigger audio, so the demo shows exactly what a
 * learner gets in the product.
 *
 * Media is currently hot-linked from Supabase Storage (the bucket is public and the
 * domain is already whitelisted in next.config.ts). Once the final word list is
 * locked we can download these files into /public and repoint `image`/audio at the
 * local copies for a fully self-contained, offline-safe demo.
 *
 * The `imagine` strings carry lightweight authoring markup that the card renders:
 * `*english*` italicises the target English word and `{{sound-alike}}` sets the memory
 * hook in bold in the word's gender colour (blue m / red f / green default), matching
 * study/test mode. While the trigger clip plays the surrounding plain text turns brand
 * blue so the gender-coloured hooks pop. `soundsLike` renders in the "(which sounds
 * like …)" hint next to the headword; `phonetic` stays unrendered.
 */
import { type HeroLanguageTab, type HeroTriggerCard } from "./heroTriggerTypes";

const SUPA =
  "https://xfauulfdbxageerwqnvo.supabase.co/storage/v1/object/public";

const FRENCH_CARDS: HeroTriggerCard[] = [
  {
    id: "chou",
    english: "cabbage",
    headword: "le chou",
    phonetic: "shoo",
    soundsLike: "shoe / shoo",
    imagine: 'A man hitting a *cabbage* with a {{SHOE}} and saying, "{{SHOO}}! Go away, *cabbage*!"',
    image: `${SUPA}/word-images/words/556c3fde-8e3d-49c5-8705-10e8ccedf867/trigger.webp?v=1783849013087`,
    audioEnglish: `${SUPA}/audio/words/556c3fde-8e3d-49c5-8705-10e8ccedf867/english.mp3?v=1785791124225`,
    audioForeign: `${SUPA}/word-audio/french/1/foreign/chou%20,m.mp3`,
    audioTrigger: `${SUPA}/word-audio/french/1/trigger/chou.mp3`,
    alt: "Cartoon of a man hitting a cabbage with a shoe",
    gender: "m",
  },
  {
    id: "lune",
    english: "moon",
    headword: "la lune",
    phonetic: "lün",
    soundsLike: "lunatic",
    imagine: "A female {{LUNA}}tic dancing about on the *moon*.",
    image: `${SUPA}/word-images/words/9c27c3a9-9312-4965-bd33-9d09def7758d/trigger.webp?v=1784752558165`,
    audioEnglish: `${SUPA}/word-audio/french/1/english/moon.mp3`,
    audioForeign: `${SUPA}/word-audio/french/1/foreign/lune%20,f.mp3`,
    audioTrigger: `${SUPA}/word-audio/french/1/trigger/lune.mp3`,
    alt: "Cartoon of a lunatic on the moon",
    gender: "f",
  },
  {
    id: "chat",
    english: "cat",
    headword: "le chat",
    phonetic: "shah",
    soundsLike: "chat + shah",
    imagine: "The *cat* having a {{CHAT}} on the lap of the {{SHAH}} of Iran.",
    image: `${SUPA}/word-images/french/chat.jpg?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/french/1/english/cat.mp3`,
    audioForeign: `${SUPA}/word-audio/french/1/foreign/chat%20,m.mp3`,
    audioTrigger: `${SUPA}/word-audio/french/1/trigger/chat.mp3`,
    alt: "Cartoon of a cat chatting on the lap of the Shah of Iran",
    gender: "m",
  },
];

const SPANISH_CARDS: HeroTriggerCard[] = [
  {
    id: "vaca",
    english: "cow",
    headword: "la vaca",
    phonetic: "bah-kah",
    soundsLike: "vac (vacuum)",
    imagine: "A *cow* {{VAC}}uuming the house.",
    image: `${SUPA}/word-images/spanish/vaca.gif?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/spanish/1/english/cow.mp3`,
    audioForeign: `${SUPA}/word-audio/spanish/1/foreign/vaca.mp3`,
    audioTrigger: `${SUPA}/word-audio/spanish/1/trigger/vaca.mp3`,
    alt: "Cartoon of a cow vacuuming the house",
    gender: "f",
  },
  {
    id: "gato",
    english: "cat",
    headword: "el gato",
    phonetic: "gah-toh",
    soundsLike: "gateau / gate",
    imagine: "A *cat* eating a chocolate {{GATEAU}} by an open {{GATE}}.",
    image: `${SUPA}/word-images/spanish/gato.png?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/spanish/1/english/cat.mp3`,
    audioForeign: `${SUPA}/word-audio/spanish/1/foreign/gato.mp3`,
    audioTrigger: `${SUPA}/word-audio/spanish/1/trigger/gato.mp3`,
    alt: "Cartoon of a cat eating a chocolate gateau by a gate",
    gender: "m",
  },
  {
    id: "sol",
    english: "sun",
    headword: "el sol",
    phonetic: "sol",
    soundsLike: "Solomon / soul",
    imagine: "King {{SOL}}omon prays to the *sun* for his {{SOUL}} to be saved.",
    image: `${SUPA}/word-images/spanish/sol.gif?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/spanish/1/english/sun.mp3`,
    audioForeign: `${SUPA}/word-audio/spanish/1/foreign/sol.mp3`,
    audioTrigger: `${SUPA}/word-audio/spanish/1/trigger/sol.mp3`,
    alt: "Cartoon of King Solomon praying to the sun",
    gender: "m",
  },
];

const GERMAN_CARDS: HeroTriggerCard[] = [
  {
    id: "hut",
    english: "hat",
    headword: "der Hut",
    phonetic: "hoot",
    soundsLike: "hoot",
    imagine: 'The Mad Hatter from Alice in Wonderland has a *hat* that goes "{{HOOT}}!"',
    image: `${SUPA}/word-images/german/Hut.png?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/german/1/english/hat.mp3`,
    audioForeign: `${SUPA}/word-audio/german/1/foreign/Hut%20,m.mp3`,
    audioTrigger: `${SUPA}/word-audio/german/1/trigger/Hut.mp3`,
    alt: "Cartoon of the Mad Hatter's hat that hoots",
    gender: "m",
  },
  {
    id: "sonne",
    english: "sun",
    headword: "die Sonne",
    phonetic: "zon-nuh",
    soundsLike: "sun",
    imagine: "Lying in the {{SUN}} is Sharon Stone, waving a German flag.",
    image: `${SUPA}/word-images/german/Sonne.gif?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/german/1/english/sun.mp3`,
    audioForeign: `${SUPA}/word-audio/german/1/foreign/Sonne%20,f.mp3`,
    audioTrigger: `${SUPA}/word-audio/german/1/trigger/Sonne.mp3`,
    alt: "Cartoon of Sharon Stone lying in the sun with a German flag",
    gender: "f",
  },
  {
    id: "kuchen",
    english: "cake",
    headword: "der Kuchen",
    phonetic: "koo-khen",
    soundsLike: "cook / cookin'",
    imagine: "A chef, Robin {{COOK}}, {{COOKIN'}} a huge pie and a huge *cake*.",
    image: `${SUPA}/word-images/german/Kuchen.jpg?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/german/1/english/cake%20,pie.mp3`,
    audioForeign: `${SUPA}/word-audio/german/1/foreign/Kuchen%20,m.mp3`,
    audioTrigger: `${SUPA}/word-audio/german/1/trigger/Kuchen.mp3`,
    alt: "Cartoon of a chef cooking a huge cake and pie",
    gender: "m",
  },
];

const ITALIAN_CARDS: HeroTriggerCard[] = [
  {
    id: "fragola",
    english: "strawberry",
    headword: "la fragola",
    phonetic: "frah-go-lah",
    soundsLike: "frog + goal",
    imagine: "Kicking a *strawberry*, the female {{FROG}} scores a {{GOAL}} — a {{FROG GOAL}}... AAHH!",
    image: `${SUPA}/word-images/fragola%20%2Cla.png?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/1/english/strawberry%20%2Cla-f.mp3`,
    audioForeign: `${SUPA}/word-audio/1/foreign/fragola%20%2Cla-f.mp3`,
    audioTrigger: `${SUPA}/word-audio/1/trigger/fragola%20%2Cla.mp3`,
    alt: "Cartoon of a female frog scoring a goal with a strawberry",
    gender: "f",
  },
  {
    id: "tegame",
    english: "pan",
    headword: "il tegame",
    phonetic: "teh-gah-meh",
    soundsLike: "tea game",
    imagine: "Mr T using a *pan* to play a {{TEA GAME}}.",
    image: `${SUPA}/word-images/tegame%20%2Cil.png?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/1/english/pan%20%2Cil.mp3`,
    audioForeign: `${SUPA}/word-audio/1/foreign/tegame%20%2Cil.mp3`,
    audioTrigger: `${SUPA}/word-audio/1/trigger/tegame%20%2Cil.mp3`,
    alt: "Cartoon of Mr T playing a tea game with a pan",
    gender: "m",
  },
  {
    id: "nuotare",
    english: "to swim",
    headword: "nuotare",
    phonetic: "nwo-tah-reh",
    soundsLike: "new tyre",
    imagine: "*Swimming* about in a giant {{NEW TYRE}}.",
    image: `${SUPA}/word-images/nuotare%20%2Cv.png?v=1782964818252`,
    audioEnglish: `${SUPA}/word-audio/1/english/to%20swim%20%2Cv.mp3`,
    audioForeign: `${SUPA}/word-audio/1/foreign/nuotare%20%2Cv.mp3`,
    audioTrigger: `${SUPA}/word-audio/1/trigger/nuotare%20%2Cv.mp3`,
    alt: "Cartoon of a man swimming inside a new tyre",
    gender: null,
  },
];

/** All four tabs populated with real 200WAD words, art and audio. */
export const HERO_LANGUAGES_G: HeroLanguageTab[] = [
  { slug: "french", name: "French", flag: "🇫🇷", cards: FRENCH_CARDS },
  { slug: "spanish", name: "Spanish", flag: "🇪🇸", cards: SPANISH_CARDS },
  { slug: "german", name: "German", flag: "🇩🇪", cards: GERMAN_CARDS },
  { slug: "italian", name: "Italian", flag: "🇮🇹", cards: ITALIAN_CARDS },
];
