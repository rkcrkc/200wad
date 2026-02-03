/**
 * Language code to flag emoji mapping
 * Maps ISO 639-1 language codes to their corresponding flag emojis
 */

const languageToFlag: Record<string, string> = {
  // Primary supported languages
  it: "🇮🇹", // Italian
  es: "🇪🇸", // Spanish
  fr: "🇫🇷", // French
  de: "🇩🇪", // German
  cy: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", // Welsh
  id: "🇮🇩", // Indonesian (Bahasa)
  zh: "🇨🇳", // Chinese (Mandarin)

  // Additional common languages
  en: "🇬🇧", // English (UK default)
  pt: "🇵🇹", // Portuguese
  ja: "🇯🇵", // Japanese
  ko: "🇰🇷", // Korean
  ru: "🇷🇺", // Russian
  ar: "🇸🇦", // Arabic
  nl: "🇳🇱", // Dutch
  pl: "🇵🇱", // Polish
  sv: "🇸🇪", // Swedish
  da: "🇩🇰", // Danish
  no: "🇳🇴", // Norwegian
  fi: "🇫🇮", // Finnish
  el: "🇬🇷", // Greek
  tr: "🇹🇷", // Turkish
  hi: "🇮🇳", // Hindi
  th: "🇹🇭", // Thai
  vi: "🇻🇳", // Vietnamese
  uk: "🇺🇦", // Ukrainian
  cs: "🇨🇿", // Czech
  hu: "🇭🇺", // Hungarian
  ro: "🇷🇴", // Romanian
  he: "🇮🇱", // Hebrew
  ms: "🇲🇾", // Malay
  tl: "🇵🇭", // Tagalog/Filipino
};

/**
 * Get the flag emoji for a given language code
 * @param code - ISO 639-1 language code (e.g., 'it', 'es', 'fr')
 * @returns The corresponding flag emoji, or a default flag if not found
 */
export function getFlagFromCode(code: string | null | undefined): string {
  if (!code) return "🏳️";
  return languageToFlag[code.toLowerCase()] || "🏳️";
}

/**
 * Check if a language code has a known flag mapping
 * @param code - ISO 639-1 language code
 * @returns True if the code has a flag mapping
 */
export function hasFlag(code: string): boolean {
  return code.toLowerCase() in languageToFlag;
}

/**
 * Get all supported language codes
 * @returns Array of supported ISO 639-1 language codes
 */
export function getSupportedLanguageCodes(): string[] {
  return Object.keys(languageToFlag);
}
