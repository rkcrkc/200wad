import { getFlagFromCode } from "@/lib/utils/flags";
import type { BlogLanguageRef } from "@/lib/queries/blog";

/**
 * Small flag + language-name tag shown on post cards and the article header when a
 * post is tied to a language. Uses the shared `.pill` brand atom; renders nothing
 * without a language.
 */
export function LanguageTag({ language }: { language: BlogLanguageRef | null }) {
  if (!language) return null;

  return (
    <span className="eyebrow inline-flex items-center gap-1.5">
      <span aria-hidden>{getFlagFromCode(language.code)}</span>
      {language.name}
    </span>
  );
}
