import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVerbByLegacyPath } from "@/lib/queries/verbs";
import { ConjugationTable } from "../../_components/ConjugationTable";
import { VerbProse } from "../../_components/VerbProse";
import { VerbBlocks } from "../../_components/VerbBlocks";
import { ALLER_BLOCKS } from "../../_sample/aller-blocks";
import { AppCta } from "@/app/blog/_components/AppCta";

// The literal `.html` URL is the canonical, ranking-bearing address. The internal
// route is `/verbs/[lang]/[slug]`, reached via the middleware rewrite, so we
// reconstruct the legacy path from the segments to look the row up and to emit the
// canonical tag that matches what users and Google actually see in the URL bar.
function legacyPathFrom(lang: string, slug: string): string {
  return `/${lang}-verb-${slug}.html`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const verb = await getVerbByLegacyPath(legacyPathFrom(lang, slug));
  if (!verb) return { title: "Verb not found" };

  const description = verb.metaDescription ?? undefined;
  return {
    title: verb.title,
    description,
    alternates: { canonical: verb.legacyPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title: verb.title,
      description,
      url: verb.legacyPath,
      ...(verb.leadImageUrl ? { images: [{ url: verb.leadImageUrl }] } : {}),
    },
  };
}

export default async function VerbPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const verb = await getVerbByLegacyPath(legacyPathFrom(lang, slug));
  if (!verb) notFound();

  const languageName = verb.language?.name ?? "";
  const languageCode = verb.language?.code ?? "fr";

  // TEMPORARY single-page preview: `aller` renders from the faithful ordered
  // `blocks` model (verbatim headings, mnemonic inline, table in place) so we can
  // review the restyled-but-structurally-identical page in production before
  // rolling the model out to all 748 verbs. Every other verb keeps the old
  // template untouched.
  if (verb.legacyPath === "/french-verb-aller.html") {
    return (
      <article className="container pb-14 pt-16 sm:pb-20">
        <div className="mx-auto max-w-[880px]">
          <div className="card p-6 sm:p-10 lg:p-12">
            <div className="flex flex-col gap-3">
              <p className="eyebrow">
                {[languageName, "verb conjugation"].filter(Boolean).join(" · ")}
              </p>
              <h1 className="heading-xl text-[var(--ink)]">{verb.h1}</h1>
            </div>
            <VerbBlocks
              blocks={ALLER_BLOCKS}
              languageCode={languageCode}
              conjugation={verb.conjugation}
            />
            <AppCta />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="container pb-14 pt-16 sm:pb-20">
      <div className="mx-auto max-w-[880px]">
        <div className="card p-6 sm:p-10 lg:p-12">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <p className="eyebrow">
              {[languageName, "verb conjugation"].filter(Boolean).join(" · ")}
            </p>
            <h1 className="heading-xl text-[var(--ink)]">{verb.h1}</h1>
            {verb.subtitle && (
              <p className="text-[18px] leading-[1.5] text-[var(--ink-soft)]">
                {verb.subtitle}
              </p>
            )}
            {verb.translation && (
              <p className="label-heavy text-[var(--grey-2)]">
                {verb.infinitive} — {verb.translation}
              </p>
            )}
          </div>

          {/* Lead image (the legacy cartoon mnemonic .gif), when present. */}
          {verb.leadImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={verb.leadImageUrl}
              alt={verb.leadImageAlt ?? ""}
              className="mt-8 w-full rounded-[20px] border-[3px] border-[var(--ink)] object-cover"
            />
          )}

          {/* Mnemonic memory hook. */}
          {verb.mnemonic && (
            <div className="verb-mnemonic mt-8">
              <span className="verb-mnemonic-label" aria-hidden>
                Memory hook
              </span>
              <p>{verb.mnemonic}</p>
            </div>
          )}

          {/* The conjugation table — the reason these pages rank. */}
          <ConjugationTable
            languageCode={languageCode}
            simple={verb.conjugation.simple}
            compound={verb.conjugation.compound}
          />

          {/* Explanatory prose: intro then notes. */}
          {verb.introHtml && (
            <VerbProse html={verb.introHtml} heading="About this verb" />
          )}
          {verb.notesHtml && (
            <VerbProse html={verb.notesHtml} heading="Conjugation notes" />
          )}

          <AppCta />
        </div>
      </div>
    </article>
  );
}
