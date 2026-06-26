"use server";

import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type {
  BillingData,
  BillingInvoice,
  BillingPaymentMethod,
} from "@/lib/queries/billing.types";

const EMPTY: BillingData = {
  hasCustomer: false,
  paymentMethods: [],
  upcomingInvoice: null,
  pastInvoices: [],
};

/**
 * Fetch the authenticated user's billing details live from Stripe: saved card
 * payment methods, the upcoming invoice preview, and recent past invoices.
 *
 * Invoices and payment methods are not mirrored in our DB, so this reads
 * straight from Stripe via the customer id stored on the user row. Returns an
 * empty (hasCustomer: false) result for users without a Stripe customer, and a
 * populated `error` if the Stripe calls fail — callers render an empty/error
 * state rather than throwing. Invoked from the client BillingSection on mount.
 */
export async function getBillingData(): Promise<BillingData> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return EMPTY;

    const admin = createAdminClient();
    const { data: userData } = await admin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = userData?.stripe_customer_id;
    if (!customerId) return EMPTY;

    const stripe = getStripe();

    // The customer's default payment method lives on invoice_settings; use it to
    // flag the default card in the list.
    const customer = await stripe.customers.retrieve(customerId);
    let defaultPmId: string | null = null;
    if (!("deleted" in customer)) {
      const dpm = customer.invoice_settings?.default_payment_method;
      defaultPmId = typeof dpm === "string" ? dpm : (dpm?.id ?? null);
    }

    const [pmList, invoiceList] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: "card" }),
      stripe.invoices.list({ customer: customerId, limit: 12 }),
    ]);

    const paymentMethods: BillingPaymentMethod[] = pmList.data
      .filter((pm): pm is Stripe.PaymentMethod & { card: Stripe.PaymentMethod.Card } =>
        Boolean(pm.card)
      )
      .map((pm) => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: pm.id === defaultPmId,
      }));

    const pastInvoices: BillingInvoice[] = invoiceList.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount_paid || inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
    }));

    // Upcoming invoice preview only exists for an active recurring subscription.
    // Stripe throws when there's nothing to preview (e.g. lifetime/cancelled), so
    // a failure here just means "no upcoming charge".
    let upcomingInvoice: BillingData["upcomingInvoice"] = null;
    try {
      const preview = await stripe.invoices.createPreview({ customer: customerId });
      upcomingInvoice = {
        amount: preview.amount_due,
        currency: preview.currency,
        nextChargeAt: preview.next_payment_attempt ?? preview.period_end ?? null,
      };
    } catch {
      upcomingInvoice = null;
    }

    return { hasCustomer: true, paymentMethods, upcomingInvoice, pastInvoices };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load billing";
    return { ...EMPTY, error: message };
  }
}
