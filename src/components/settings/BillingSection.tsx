"use client";

import { useEffect, useState, useTransition } from "react";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBillingData } from "@/lib/queries/billing";
import type { BillingData } from "@/lib/queries/billing.types";
import { createCustomerPortalSession } from "@/lib/mutations/subscriptions";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Settings → Billing card. Lazy-loads the user's Stripe billing details on mount
 * (payment methods, upcoming invoice, invoice history) and links out to the
 * hosted Stripe portal for actually changing cards. Renders self-contained
 * loading / empty / error states so a slow or failing Stripe call never blocks
 * the rest of the settings page.
 */
export function BillingSection() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalPending, startPortal] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getBillingData();
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPortal = () => {
    startPortal(async () => {
      const result = await createCustomerPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      }
    });
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Billing</h2>
        {data?.hasCustomer && (
          <Button variant="outline" onClick={openPortal} disabled={portalPending}>
            {portalPending ? "Opening..." : "Manage billing"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading billing details…
        </div>
      ) : !data || data.error ? (
        <p className="text-sm text-gray-600">
          We couldn’t load your billing details right now. Please try again later.
        </p>
      ) : !data.hasCustomer ? (
        <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
          You don’t have any billing history yet. Subscribe to a plan to see your
          payment methods and invoices here.
        </div>
      ) : (
        <>
          {/* Payment methods */}
          <div className="mb-6 border-b border-gray-200 pb-6">
            <h3 className="mb-3 font-medium">Payment methods</h3>
            {data.paymentMethods.length === 0 ? (
              <p className="text-sm text-gray-500">No payment methods on file.</p>
            ) : (
              <ul className="space-y-2">
                {data.paymentMethods.map((pm) => (
                  <li key={pm.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <CreditCard className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {titleCase(pm.brand)} •••• {pm.last4}
                    </span>
                    <span className="text-xs text-gray-500">
                      Expires {pm.expMonth}/{pm.expYear}
                    </span>
                    {pm.isDefault && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Default
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Upcoming invoice */}
          <div className="mb-6 border-b border-gray-200 pb-6">
            <h3 className="mb-3 font-medium">Upcoming invoice</h3>
            {data.upcomingInvoice ? (
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-700">
                  {data.upcomingInvoice.nextChargeAt
                    ? `Next charge on ${formatDate(data.upcomingInvoice.nextChargeAt)}`
                    : "Next charge"}
                </span>
                <span className="font-medium text-gray-900">
                  {formatMoney(
                    data.upcomingInvoice.amount,
                    data.upcomingInvoice.currency
                  )}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming charges.</p>
            )}
          </div>

          {/* Invoice history */}
          <div>
            <h3 className="mb-3 font-medium">Invoice history</h3>
            {data.pastInvoices.length === 0 ? (
              <p className="text-sm text-gray-500">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.pastInvoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">
                        {formatDate(inv.created)}
                      </span>
                      {inv.status && (
                        <span className="text-xs text-gray-500">
                          {titleCase(inv.status)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatMoney(inv.amount, inv.currency)}
                      </span>
                      {inv.hostedInvoiceUrl && (
                        <a
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Receipt
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
