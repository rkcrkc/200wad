/**
 * Shared styling atoms for the marketing `.site` brand skin on the auth pages
 * (login, signup, forgot-password, reset-password). Mirrors the inline
 * `FIELD_CLASS`/`LABEL_CLASS` precedent in `ContactForm`, but single-sourced here
 * because the four auth screens repeat the same card / field / label / submit
 * shapes. These strings assume they render inside a `.site` wrapper (the auth
 * layout provides it), so `.card`, `.btn`, `.label-heavy` and the brand tokens
 * (`--ink`, `--ink-soft`, `--accent`, `--destructive`) all resolve.
 */

/** Bordered off-white brand surface — `.card` (3px ink border, hard offset shadow). */
export const AUTH_CARD = "card w-full max-w-md p-8 sm:p-10";

/** Bordered white input with an accent focus ring, ink text, soft placeholder. */
export const AUTH_FIELD =
  "w-full rounded-[12px] border-2 border-[var(--ink)] bg-white p-3.5 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

/** Field label — the brand `.label-heavy` face in full ink. */
export const AUTH_LABEL = "label-heavy text-[var(--ink)]";

/** Inline error banner — destructive-tinted, bordered to match the field radius. */
export const AUTH_ERROR =
  "rounded-[12px] border-2 border-[var(--destructive)] bg-[var(--destructive)]/10 p-3 text-[14px] font-medium text-[var(--destructive)]";

/** Primary submit — full-width brand `.btn big`, centred label (+ trailing arrow). */
export const AUTH_SUBMIT =
  "btn big w-full text-center disabled:pointer-events-none disabled:opacity-60";

/** "or" rule between the email form and the Google button. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--ink)]/15" />
      <span className="eyebrow">or</span>
      <span className="h-px flex-1 bg-[var(--ink)]/15" />
    </div>
  );
}
