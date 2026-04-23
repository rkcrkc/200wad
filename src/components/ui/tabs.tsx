"use client";

import { Fragment, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/helpers";

export interface Tab {
  id: string;
  label: string | ReactNode;
  count?: number;
  /** Render a vertical separator immediately after this tab. */
  separatorAfter?: boolean;
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
      className={cn("flex gap-2 overflow-x-auto", className)}
      data-tabs=""
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Fragment key={tab.id}>
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              data-tab-id={tab.id}
              data-state={isActive ? "active" : "inactive"}
              onClick={() => onChange(tab.id)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 transition-colors",
                isActive
                  ? "bg-beige text-foreground"
                  : "text-foreground/50 hover:text-foreground/75"
              )}
              style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.35, letterSpacing: '-0.01em' }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs opacity-60" data-tab-count="">
                  ({formatNumber(tab.count)})
                </span>
              )}
            </button>
            {tab.separatorAfter && (
              <div
                aria-hidden="true"
                className="mx-1 h-5 w-px shrink-0 self-center bg-border"
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
