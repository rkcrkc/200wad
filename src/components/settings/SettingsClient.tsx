"use client";

import {
  PreferencesSection,
  BillingSection,
  SecuritySection,
  DataExportSection,
  MarketingEmailSection,
  DangerZoneSection,
} from "@/components/settings";

interface SettingsClientProps {
  email: string;
  dailyXpGoal: number;
  marketingEmailConsent: boolean | null;
}

export function SettingsClient({ email, dailyXpGoal, marketingEmailConsent }: SettingsClientProps) {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold">Settings</h1>

      <PreferencesSection dailyXpGoal={dailyXpGoal} />
      <BillingSection />
      <SecuritySection email={email} />
      <MarketingEmailSection marketingEmailConsent={marketingEmailConsent} />
      <DataExportSection />
      <DangerZoneSection />
    </div>
  );
}
