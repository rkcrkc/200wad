/**
 * Registry of per-language import configs. Keyed by `languages.name`
 * (case-insensitive) so the importer can look one up from `--language`.
 */

import type { LanguageConfig } from "../lib/legacy-import/types";
import { italianConfig } from "./italian";
import { frenchConfig } from "./french";
import { french2Config } from "./french2";

const configs: Record<string, LanguageConfig> = {
  italian: italianConfig,
  french: frenchConfig,
  // French 2 (Volume 2): same NL "french" language, new courses. See french2.ts.
  french2: french2Config,
};

export function getLanguageConfig(name: string): LanguageConfig | undefined {
  return configs[name.trim().toLowerCase()];
}
