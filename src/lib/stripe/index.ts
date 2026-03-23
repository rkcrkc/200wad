import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Returns a lazy-initialized Stripe instance.
 * Follows the same singleton pattern as createAdminClient() in supabase/admin.ts.
 * Only use server-side — never import this in client components.
 */
export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Please add it to your .env.local file."
    );
  }

  stripeInstance = new Stripe(secretKey, {
    typescript: true,
  });

  return stripeInstance;
}
