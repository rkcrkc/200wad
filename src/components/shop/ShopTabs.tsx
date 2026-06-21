"use client";

import { useState, type ReactNode } from "react";
import { Tabs, type Tab } from "@/components/ui/tabs";
import { CoinHistory } from "@/components/shop/CoinHistory";
import type { CoinHistoryEntry, CoinTotals } from "@/lib/coins";

const TABS: Tab[] = [
  { id: "available", label: "Available" },
  { id: "history", label: "History" },
];

interface ShopTabsProps {
  initialHistory: CoinHistoryEntry[];
  historyHasMore: boolean;
  historyTotals: CoinTotals;
  /** The server-rendered "Available" catalogue. */
  children: ReactNode;
}

export function ShopTabs({
  initialHistory,
  historyHasMore,
  historyTotals,
  children,
}: ShopTabsProps) {
  const [tab, setTab] = useState<"available" | "history">("available");

  return (
    <>
      <Tabs
        tabs={TABS}
        activeTab={tab}
        onChange={(id) => setTab(id as "available" | "history")}
        className="mb-8"
      />

      {/* Keep the catalogue mounted so its server-rendered state survives tab
          switches; just hide it when History is active. */}
      <div hidden={tab !== "available"}>{children}</div>

      {tab === "history" && (
        <CoinHistory
          initialEntries={initialHistory}
          hasMore={historyHasMore}
          totals={historyTotals}
        />
      )}
    </>
  );
}
