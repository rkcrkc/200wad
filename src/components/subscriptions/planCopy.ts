/**
 * Shared price/label formatting for the subscriptions page. Prices render as
 * whole dollars (no cents) to match the simplified card design.
 */

/** What an upgrade CTA is trying to unlock (one language, or every language). */
export interface UpgradeTarget {
  tier: "language" | "all-languages";
  /** Language id for a language upgrade; null for the all-languages bundle. */
  targetId: string | null;
  targetName: string;
  /** Flag emoji (language flag, or 🌍 for all-languages). */
  flag: string;
}

/** Order billing options monthly → annual → lifetime regardless of price. */
export const BILLING_ORDER: Record<string, number> = {
  monthly: 0,
  annual: 1,
  lifetime: 2,
};

export function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

export function getBillingSuffix(model: string): string {
  if (model === "monthly") return "/mo";
  if (model === "annual") return "/yr";
  return "";
}

export function getPlanLabel(plan: string): string {
  if (plan === "monthly") return "Monthly";
  if (plan === "annual") return "Annual";
  if (plan === "lifetime") return "Lifetime";
  return plan;
}

/** Replace {token} placeholders; unknown tokens are left untouched. */
export function interpolate(
  template: string,
  tokens: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in tokens ? String(tokens[key]) : match
  );
}
