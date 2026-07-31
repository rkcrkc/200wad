"use client";

import { useTransition } from "react";
import { toast } from "@/lib/toast";
import { PageHeader, type PageHeaderAction } from "@/components/ui/PageHeader";
import { createCustomerPortalSession } from "@/lib/mutations/subscriptions";

/**
 * Title row for the subscriptions page. Combines the "All courses" navigation
 * with the stateful "Manage billing" action (opens the Stripe portal) so both
 * render inline on desktop and collapse into the mobile kebab together.
 */
export function SubscriptionsPageHeader() {
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

  const actions: PageHeaderAction[] = [
    {
      label: pending ? "Opening…" : "Manage billing",
      onClick: openPortal,
      icon: "credit-card",
    },
    {
      label: "All courses",
      href: "/dashboard?pick=true",
      icon: "globe",
    },
  ];

  return <PageHeader title="My Subscription" actions={actions} />;
}
