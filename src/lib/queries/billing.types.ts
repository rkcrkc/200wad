/**
 * Serializable shapes for the Settings → Billing section. Kept in a plain module
 * (no "use server" directive) so both the server action and the client component
 * can import them — a "use server" file may only export async functions.
 */

export interface BillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BillingInvoice {
  id: string;
  /** Stripe invoice number (e.g. "ABCD-0001"); null for drafts. */
  number: string | null;
  /** Amount in the smallest currency unit (cents). */
  amount: number;
  currency: string;
  status: string | null;
  /** Unix seconds. */
  created: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface BillingUpcomingInvoice {
  /** Amount due in the smallest currency unit (cents). */
  amount: number;
  currency: string;
  /** Unix seconds of the next charge attempt, if known. */
  nextChargeAt: number | null;
}

export interface BillingData {
  /** False when the user has no Stripe customer yet (free/never-subscribed). */
  hasCustomer: boolean;
  paymentMethods: BillingPaymentMethod[];
  upcomingInvoice: BillingUpcomingInvoice | null;
  pastInvoices: BillingInvoice[];
  /** Set when the Stripe fetch failed; the UI shows a friendly error. */
  error?: string | null;
}
