/**
 * Italian language config — the regression anchor.
 *
 * Italian overrides nothing: every field comes from a CSV column, every gender
 * code exact-matches the mapping, and ICC === Ref (no ProductFlag). The
 * field-source defaults and course-mapping flag-0 case reproduce the original
 * importer exactly, so an Italian `--dry-run` must be identical before/after the
 * refactor.
 */

import type { LanguageConfig } from "../lib/legacy-import/types";

export const italianConfig: LanguageConfig = {
  name: "italian",
};
