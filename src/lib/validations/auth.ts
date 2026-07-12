/**
 * Centralised password policy.
 *
 * Keep these three in sync when changing the minimum:
 *  1. PASSWORD_MIN_LENGTH here (client checks + change-password server action),
 *  2. Supabase Auth → Providers → Email → "Minimum password length",
 *  3. any copy that quotes the requirement to the user.
 *
 * Guidance: length-based only. Modern NIST/OWASP advice is to require a longer
 * minimum and screen against breached passwords (Supabase's leaked-password /
 * HaveIBeenPwned check) rather than impose composition rules (must contain a
 * digit/symbol), which mostly harm usability without improving strength.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;

/**
 * Validate a password against the app's policy. Returns an error message to
 * show the user, or null when the password is acceptable.
 */
export function getPasswordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_TOO_SHORT_MESSAGE;
  }
  return null;
}
