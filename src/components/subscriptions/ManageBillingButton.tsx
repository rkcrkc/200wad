"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCustomerPortalSession } from "@/lib/mutations/subscriptions";

/**
 * Opens the hosted Stripe billing portal (same action as Settings → Billing).
 * Client-only because it triggers a redirect from a Server Action result.
 */
export function ManageBillingButton() {
  const [pending, start] = useTransition();

  const openPortal = () => {
    start(async () => {
      const result = await createCustomerPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Couldn't open the billing portal.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={openPortal}
      disabled={pending}
      className="shrink-0 gap-1.5"
    >
      <CreditCard className="h-4 w-4" />
      {pending ? "Opening…" : "Manage billing"}
    </Button>
  );
}
