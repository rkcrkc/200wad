"use client";

import { PricingPlansSection } from "./PricingPlansSection";
import { PricingCopySection } from "./PricingCopySection";
import { PlatformConfigSection } from "./PlatformConfigSection";
import { SubscriptionStatsSection } from "./SubscriptionStatsSection";
import type { AdminSettingsData } from "@/lib/queries/admin";

interface AdminSettingsClientProps {
  data: AdminSettingsData;
}

export function AdminSettingsClient({ data }: AdminSettingsClientProps) {
  return (
    <div className="space-y-8">
      <SubscriptionStatsSection stats={data.subscriptionStats} />
      <PricingPlansSection plans={data.pricingPlans} />
      <PricingCopySection copy={data.pricingCopy} />
      <PlatformConfigSection config={data.config} />
    </div>
  );
}
