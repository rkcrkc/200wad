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
  hasPassword: boolean;
  googleConnected: boolean;
  pendingEmail: string | null;
}

export function SettingsClient({
  email,
  dailyXpGoal,
  marketingEmailConsent,
  hasPassword,
  googleConnected,
  pendingEmail,
}: SettingsClientProps) {
  return (
    <div>
      <h1 className="mb-8 text-page-header">Settings</h1>

      <PreferencesSection dailyXpGoal={dailyXpGoal} />
      <BillingSection />
      <SecuritySection
        email={email}
        hasPassword={hasPassword}
        googleConnected={googleConnected}
        pendingEmail={pendingEmail}
      />
      <MarketingEmailSection marketingEmailConsent={marketingEmailConsent} />
      <DataExportSection />
      <DangerZoneSection />
    </div>
  );
}
