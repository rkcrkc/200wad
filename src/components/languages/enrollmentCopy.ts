/**
 * Shared confirmation copy for enrolling / unenrolling a language, used by both
 * the per-card actions (LanguageCardActions) and the "Add languages" popup
 * (ManageLanguagesMenu) so the wording stays in sync across surfaces.
 */

export function addLanguageConfirmCopy(name: string) {
  return {
    title: `Add ${name} to My Languages?`,
    message: `${name} will appear in My Languages and your course switcher for quick access.`,
  };
}

export function removeLanguageConfirmCopy(name: string) {
  return {
    title: `Remove ${name}?`,
    message: `${name} will move back to Available Languages and leave your course switcher. Your progress is kept, and it'll reappear if you study it again.`,
  };
}
