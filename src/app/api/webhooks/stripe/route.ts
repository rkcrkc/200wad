import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertFromTemplate } from "@/lib/notifications/template";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Disable body parsing — we need the raw body for signature verification
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription, event);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase, invoice);
        break;
      }

      default:
        // Unhandled event type — acknowledge silently
        break;
    }
  } catch (err) {
    console.error(`Error handling webhook event ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ============================================================================
// Event Handlers
// ============================================================================

type AdminClient = ReturnType<typeof createAdminClient>;

interface CheckoutItemMeta {
  pricingPlanId: string;
  tier: string;
  targetId: string | null;
}

async function handleCheckoutCompleted(
  supabase: AdminClient,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const itemsJson = session.metadata?.items;

  if (!userId || !itemsJson) {
    console.error("Checkout session missing user_id or items metadata");
    return;
  }

  const items: CheckoutItemMeta[] = JSON.parse(itemsJson);
  const isSubscription = session.mode === "subscription";

  for (const item of items) {
    // Look up the pricing plan for amount
    const { data: plan } = await supabase
      .from("pricing_plans")
      .select("amount_cents, currency, billing_model")
      .eq("id", item.pricingPlanId)
      .single();

    const subscriptionData = {
      user_id: userId,
      type: item.tier,
      target_id: item.targetId,
      status: "active" as const,
      plan: plan?.billing_model || (isSubscription ? "monthly" : "lifetime"),
      amount_cents: plan?.amount_cents || 0,
      currency: plan?.currency || "usd",
      stripe_customer_id: session.customer as string | null,
      stripe_subscription_id: isSubscription
        ? (session.subscription as string | null)
        : null,
    };

    await supabase.from("subscriptions").insert(subscriptionData);
  }
}

async function handleInvoicePaid(
  supabase: AdminClient,
  invoice: Stripe.Invoice
) {
  // In Stripe API v2025+, subscription is under parent.subscription_details
  const subDetail = invoice.parent?.subscription_details?.subscription;
  const stripeSubId =
    typeof subDetail === "string" ? subDetail : subDetail?.id;

  if (!stripeSubId) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: invoice.lines.data[0]?.period?.start
        ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
        : null,
      current_period_end: invoice.lines.data[0]?.period?.end
        ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
        : null,
    })
    .eq("stripe_subscription_id", stripeSubId)
    .select("user_id")
    .single();

  // Only fire a renewal notification on cycle renewals — the first payment
  // (`subscription_create`) is already implicitly acknowledged via the
  // checkout flow, so we don't double-notify.
  if (sub?.user_id && invoice.billing_reason === "subscription_cycle") {
    await insertFromTemplate("billing.subscription_renewed", {
      userId: sub.user_id,
    });
  }
}

async function handleSubscriptionUpdated(
  supabase: AdminClient,
  subscription: Stripe.Subscription,
  event: Stripe.Event
) {
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "active",
    canceled: "cancelled",
    unpaid: "cancelled",
    incomplete: "active",
    incomplete_expired: "expired",
    trialing: "active",
    paused: "paused",
  };

  const mappedStatus = statusMap[subscription.status] || "active";

  // In Stripe v2025+, period dates are on subscription items, not the subscription
  const firstItem = subscription.items.data[0];
  const periodStart = firstItem?.current_period_start;
  const periodEnd = firstItem?.current_period_end;

  const { data: sub } = await supabase
    .from("subscriptions")
    .update({
      status: mappedStatus,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id")
    .single();

  // Detect a real plan/price change by checking previous_attributes.items —
  // Stripe only includes that key on the event when items actually changed.
  // We avoid notifying on every status flip or metadata tweak.
  const prev = (event.data.previous_attributes ?? {}) as Record<string, unknown>;
  const itemsChanged = "items" in prev || "plan" in prev;
  if (sub?.user_id && itemsChanged) {
    await insertFromTemplate("billing.plan_changed", {
      userId: sub.user_id,
    });
  }
}

async function handleSubscriptionDeleted(
  supabase: AdminClient,
  subscription: Stripe.Subscription
) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id")
    .single();

  if (sub?.user_id) {
    await insertFromTemplate("billing.subscription_cancelled", {
      userId: sub.user_id,
    });
  }
}

async function handleInvoicePaymentFailed(
  supabase: AdminClient,
  invoice: Stripe.Invoice
) {
  // Extract subscription ID from invoice
  const subDetail = invoice.parent?.subscription_details?.subscription;
  const stripeSubId =
    typeof subDetail === "string" ? subDetail : subDetail?.id;

  if (!stripeSubId) return;

  // Mark subscription as past_due
  const { data: sub } = await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", stripeSubId)
    .select("user_id")
    .single();

  // Insert in-app notification so user sees an alert. Content + channels
  // come from the 'billing.payment_failed' template, which admins can edit
  // or disable via /admin/notifications.
  if (sub?.user_id) {
    await insertFromTemplate("billing.payment_failed", {
      userId: sub.user_id,
    });
  }
}
