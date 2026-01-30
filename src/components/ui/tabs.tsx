"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string | ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-regular-semibold transition-colors",
            activeTab === tab.id
              ? "bg-[#F2EAD9] text-foreground"
              : "text-foreground/50 hover:text-foreground/75"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
