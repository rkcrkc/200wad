"use client";

import {
  PreferencesSection,
  BillingSection,
  SecuritySection,
  DangerZoneSection,
} from "@/components/settings";

interface SettingsClientProps {
  email: string;
  twoFactorEnabled: boolean;
  dailyXpGoal: number;
}

export function SettingsClient({
  email,
  twoFactorEnabled,
  dailyXpGoal,
}: SettingsClientProps) {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold">Settings</h1>

      <PreferencesSection dailyXpGoal={dailyXpGoal} />
      <BillingSection />
      <SecuritySection email={email} twoFactorEnabled={twoFactorEnabled} />
      <DangerZoneSection />
    </div>
  );
}
