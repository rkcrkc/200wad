"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import {
  SecuritySection,
  PreferencesSection,
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
  const [activeTab, setActiveTab] = useState("preferences");

  const tabs = [
    { id: "preferences", label: "Preferences" },
    { id: "account", label: "Account" },
  ];

  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold">Settings</h1>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-8" />

      {activeTab === "account" && (
        <>
          <SecuritySection
            email={email}
            twoFactorEnabled={twoFactorEnabled}
          />
          <DangerZoneSection />
        </>
      )}

      {activeTab === "preferences" && (
        <PreferencesSection dailyXpGoal={dailyXpGoal} />
      )}
    </div>
  );
}
