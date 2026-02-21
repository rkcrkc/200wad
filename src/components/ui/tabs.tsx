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
    <div
      role="tablist"
      className={cn("flex gap-2", className)}
      data-tabs=""
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-tab-id={tab.id}
            data-state={isActive ? "active" : "inactive"}
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-full px-4 py-1.5 transition-colors",
              isActive
                ? "bg-[#F2EAD9] text-foreground"
                : "text-foreground/50 hover:text-foreground/75"
            )}
            style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.35, letterSpacing: '-0.01em' }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs opacity-60" data-tab-count="">
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
