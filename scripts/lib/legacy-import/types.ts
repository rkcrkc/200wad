/**
 * Shared types for the legacy-database import pipeline and per-language configs.
 */

export interface Product {
  Ref: string;
  Product: string;
  // French Products.csv carries these; Italian's does not (left undefined).
  ProductFlag?: string;
  DecFlag?: string;
  Seq?: string;
}

export interface Section {
  Course: string;
  Lesson: string;
  Section: string;
  Pointer: string;
}

export interface GenderCodeMapping {
  Code: string;
  language: string;
  category: string;
  part_of_speech: string;
  gender: string;
  grammatical_number: string;
  transitivity: string;
  is_irregular: string;
  phrase_type: string;
  tags: string;
}

export interface GeneralRow {
  // New NL columns (pre-mapped in CSV — present in the Italian export)
  english: string;
  headword: string;
  notes: string;
  memory_trigger_text: string;
  memory_trigger_image: string;
  audio_url_english: string;
  audio_url_foreign: string;
  audio_url_trigger: string;
  lemma: string;
  lesson_id: string;
  old_gender: string;
  // Legacy DL columns
  Course: string;
  Lesson: string;
  LessonSortOrder: string;
  RefN: string;
  Gender: string;
  FgnDictionary: string;
  EngDictionary: string;
  FileFgnPic: string;
  FilePSuffix: string;
  FileEngSouRTF: string;
  FileFgnSouRTF: string;
  FileFgnTrigger: string;
  FlagFalseFriends: string;
  CompoundRef1N: string;
  CompoundRef2N: string;
  LinkN: string;
  MiniLinkN: string;
  English: string;
  ForeignRTF: string;
  Notes: string;
  Trigger: string;
  Queries: string;
}

export interface WordInsert {
  language_id: string;
  english: string;
  headword: string;
  lemma: string;
  notes: string | null;
  memory_trigger_text: string | null;
  memory_trigger_image_url: string | null;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
  part_of_speech: string | null;
  gender: string | null;
  grammatical_number: string | null;
  transitivity: string | null;
  is_irregular: boolean | null;
  category: string;
  phrase_type: string | null;
  tags: string[] | null;
  is_false_friend: boolean;
  legacy_refn: number;
  legacy_gender_code: string | null;
  legacy_image_suffix: string | null;
}

export interface RelationshipStaging {
  word_legacy_refn: number;
  related_legacy_refn: number;
  relationship_type: string;
}

// ============================================================================
// Per-language configuration
// ============================================================================

/**
 * Reads plain / formatted text out of an RTF folder on the mounted disc.
 * Implemented in `rtf.ts`. Italian never touches this (all fields are columns),
 * so its config leaves `rtfRoot` undefined and the resolver is never built.
 */
export interface RtfResolver {
  /** Plain-text body of `<folder>/<key>.rtf`, or null if missing/blank. */
  readPlain(folder: string, key: string): string | null;
  /**
   * Body of `<folder>/<key>.rtf` with the app's formatted-text markers
   * (`{{…}}` highlight, `*…*` italics) preserved. Null if missing/blank.
   */
  readFormatted(folder: string, key: string): string | null;
}

export interface FieldContext {
  row: GeneralRow;
  /** Category already resolved from the gender mapping (or fallback heuristic). */
  category: string;
  /** RTF capability, or null when the language has no RTF root. */
  rtf: RtfResolver | null;
}

export interface CourseDef {
  /** Product Ref this entry configures (matches Products.csv `Ref`). */
  ref: number;
  /**
   * Existing NL course names to match and KEEP (the importer sets legacy_ref
   * but leaves the name unchanged). Used for e.g. French Ref 1 → "Vocab #1".
   */
  matchNames?: string[];
  /** Name used when creating a new NL course. Defaults to the Product name. */
  createName?: string;
}

export interface LanguageConfig {
  /** Matches `languages.name` in NL (case-insensitive). */
  name: string;
  /**
   * Path to the canonical `200w_lexical_code_mapping.csv`. Defaults to
   * `<dataDir>/200w_lexical_code_mapping.csv` when omitted.
   */
  mappingPath?: string;
  /** Root of the mounted disc holding RTF folders. Undefined → no RTF. */
  rtfRoot?: string;
  /**
   * Explicit gender-code overrides keyed by RAW legacy code. Checked before the
   * exact/normalised mapping lookup (French uses this for `le/la`).
   */
  genderOverrides?: Record<string, GenderCodeMapping>;
  /**
   * Explicit ICC ↔ Ref course list. When omitted the importer derives the
   * course set straight from Products.csv (Italian: icc == ref).
   */
  courses?: CourseDef[];
  /** Probe text feeding the fallback-category heuristic when a code is unmapped. */
  probeEnglish?(row: GeneralRow): string;
  /** Final NL `english` value. Default: `row.english || row.English`. */
  resolveEnglish?(ctx: FieldContext): string;
  /** Final NL `headword`. Default: `row.headword || row.ForeignRTF`. */
  resolveHeadword?(ctx: FieldContext): string;
  /** Raw memory-trigger text. Default: `row.memory_trigger_text || row.Trigger`. */
  resolveTrigger?(ctx: FieldContext): string | null;
}
