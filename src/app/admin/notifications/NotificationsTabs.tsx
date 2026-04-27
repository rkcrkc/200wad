"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationsClient } from "./NotificationsClient";
import { TemplatesTab } from "./TemplatesTab";
import { TypesTab } from "./TypesTab";
import type { BroadcastWithStats } from "@/lib/queries/notifications";
import type {
  NotificationTypeConfig,
  NotificationTemplate,
} from "@/types/database";

type TabKey = "broadcasts" | "templates" | "types";

interface NotificationsTabsProps {
  broadcasts: BroadcastWithStats[];
  types: NotificationTypeConfig[];
  templates: (NotificationTemplate & {
    type_enabled: boolean;
    type_label: string;
  })[];
}

const TABS: { key: TabKey; label: string; description: string }[] = [
  {
    key: "broadcasts",
    label: "Broadcasts",
    description: "Author one-off notifications, target cohorts, schedule delivery.",
  },
  {
    key: "templates",
    label: "Templates",
    description:
      "Edit content for system-generated notifications (Stripe failures, achievements, reminders).",
  },
  {
    key: "types",
    label: "Types",
    description:
      "Master enable/disable per category. Disabling stops both broadcasts and templates of that type.",
  },
];

export function NotificationsTabs({
  broadcasts,
  types,
  templates,
}: NotificationsTabsProps) {
  const [active, setActive] = useState<TabKey>("broadcasts");

  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">{activeTab.description}</p>
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                "relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {active === "broadcasts" && (
        <NotificationsClient broadcasts={broadcasts} />
      )}
      {active === "templates" && (
        <TemplatesTab templates={templates} types={types} />
      )}
      {active === "types" && <TypesTab types={types} />}
    </div>
  );
}
