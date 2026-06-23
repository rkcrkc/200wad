/**
 * Registry of per-language import configs. Keyed by `languages.name`
 * (case-insensitive) so the importer can look one up from `--language`.
 */

import type { LanguageConfig } from "../lib/legacy-import/types";
import { italianConfig } from "./italian";
import { frenchConfig } from "./french";
import { french2Config } from "./french2";
import { spanishConfig } from "./spanish";
import { spanish2Config } from "./spanish2";
import { germanConfig } from "./german";
import { german2Config } from "./german2";

const configs: Record<string, LanguageConfig> = {
  italian: italianConfig,
  french: frenchConfig,
  // French 2 (Volume 2): same NL "french" language, new courses. See french2.ts.
  french2: french2Config,
  // Spanish 1: French-1-shaped (vocab + sentences). See spanish.ts.
  spanish: spanishConfig,
  // Spanish 2 (Volume 2): same NL "spanish" language, new courses. See spanish2.ts.
  spanish2: spanish2Config,
  // German 1: explicit-ICC {1,21} (vocab + sentences). The single MDB also holds
  // vol-2 (ICC 2/22) + proverbs (ICC 12), so explicit mode is required. See german.ts.
  german: germanConfig,
  // German 2 (Volume 2): same NL "german" language, new courses {2,22,12}
  // (vocab + sentences + proverbs), imported from the same disc. See german2.ts.
  german2: german2Config,
};

export function getLanguageConfig(name: string): LanguageConfig | undefined {
  return configs[name.trim().toLowerCase()];
}
