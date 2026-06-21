/**
 * Registry of per-language import configs. Keyed by `languages.name`
 * (case-insensitive) so the importer can look one up from `--language`.
 */

import type { LanguageConfig } from "../lib/legacy-import/types";
import { italianConfig } from "./italian";
import { frenchConfig } from "./french";

const configs: Record<string, LanguageConfig> = {
  italian: italianConfig,
  french: frenchConfig,
};

export function getLanguageConfig(name: string): LanguageConfig | undefined {
  return configs[name.trim().toLowerCase()];
}
