import { createClient } from "@/lib/supabase/server";

// ── View models ──────────────────────────────────────────────────────────────
// A single conjugated tense row: the English tense name, the target-language
// tense name, an English gloss, and the six person forms.
export interface VerbTense {
  en: string;
  native: string;
  gloss: string;
  forms: {
    je: string;
    tu: string;
    il: string;
    nous: string;
    vous: string;
    ils: string;
  };
}

export interface VerbConjugationData {
  simple: VerbTense[];
  compound: VerbTense[];
}

export interface VerbLanguageRef {
  name: string;
  code: string;
}

export interface VerbDetail {
  slug: string;
  legacyPath: string;
  infinitive: string;
  translation: string | null;
  title: string;
  metaDescription: string | null;
  h1: string;
  subtitle: string | null;
  mnemonic: string | null;
  conjugation: VerbConjugationData;
  introHtml: string | null;
  notesHtml: string | null;
  leadImageUrl: string | null;
  leadImageAlt: string | null;
  language: VerbLanguageRef | null;
}

const DETAIL_SELECT =
  "slug, legacy_path, infinitive, translation, title, meta_description, h1, subtitle, " +
  "mnemonic, conjugation, intro_html, notes_html, lead_image_url, lead_image_alt, " +
  "language:languages(name, code)";

type RawDetail = {
  slug: string;
  legacy_path: string;
  infinitive: string;
  translation: string | null;
  title: string;
  meta_description: string | null;
  h1: string;
  subtitle: string | null;
  mnemonic: string | null;
  conjugation: VerbConjugationData | null;
  intro_html: string | null;
  notes_html: string | null;
  lead_image_url: string | null;
  lead_image_alt: string | null;
  language: VerbLanguageRef | null;
};

function toDetail(row: RawDetail): VerbDetail {
  return {
    slug: row.slug,
    legacyPath: row.legacy_path,
    infinitive: row.infinitive,
    translation: row.translation,
    title: row.title,
    metaDescription: row.meta_description,
    h1: row.h1,
    subtitle: row.subtitle,
    mnemonic: row.mnemonic,
    conjugation: {
      simple: row.conjugation?.simple ?? [],
      compound: row.conjugation?.compound ?? [],
    },
    introHtml: row.intro_html,
    notesHtml: row.notes_html,
    leadImageUrl: row.lead_image_url,
    leadImageAlt: row.lead_image_alt,
    language: row.language,
  };
}

/**
 * A published verb page by its exact legacy path (e.g. `/french-verb-aller.html`).
 * The legacy path is the canonical served URL. Returns null for unknown/unpublished
 * rows (→ 404). RLS already limits reads to published rows.
 */
export async function getVerbByLegacyPath(legacyPath: string): Promise<VerbDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verb_conjugations")
    .select(DETAIL_SELECT)
    .eq("legacy_path", legacyPath)
    .maybeSingle();
  if (!data) return null;
  return toDetail(data as unknown as RawDetail);
}

/** All published verb legacy paths — powers the sitemap. */
export async function getAllVerbPaths(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verb_conjugations")
    .select("legacy_path")
    .eq("is_published", true);
  return ((data as { legacy_path: string }[] | null) ?? []).map((r) => r.legacy_path);
}
