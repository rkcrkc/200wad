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
}

export function SettingsClient({
  email,
  twoFactorEnabled,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState("account");

  const tabs = [
    { id: "account", label: "Account" },
    { id: "preferences", label: "Preferences" },
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

      {activeTab === "preferences" && <PreferencesSection />}
    </div>
  );
}
