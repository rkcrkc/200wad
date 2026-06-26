"use client";

import { Fragment, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/helpers";

/**
 * Shared styling for "tab pill" buttons (the page-level filter tabs as well as
 * smaller inline tab strips). Encodes the pill shape, typography and the
 * active/inactive colour states as variants so consumers can switch the active
 * fill (`variant`) and text size (`size`) without re-implementing the styling.
 */
export const tabPillVariants = cva(
  "shrink-0 whitespace-nowrap rounded-full transition-colors",
  {
    variants: {
      /** Active-state fill colour. */
      variant: {
        beige: "",
        bone: "",
      },
      size: {
        default: "px-4 py-1.5 text-sm font-medium leading-[1.35] tracking-[-0.01em]",
        sm: "px-3 py-1 text-[13px] font-medium leading-[1.35] tracking-[-0.01em]",
      },
      active: {
        true: "text-foreground",
        false: "text-foreground/50 hover:text-foreground/75",
      },
    },
    compoundVariants: [
      { variant: "beige", active: true, class: "bg-beige" },
      { variant: "bone", active: true, class: "bg-bone-hover" },
    ],
    defaultVariants: {
      variant: "beige",
      size: "default",
      active: false,
    },
  }
);

export interface Tab {
  id: string;
  label: string | ReactNode;
  count?: number;
  /** Render a vertical separator immediately after this tab. */
  separatorAfter?: boolean;
}

interface TabsProps
  extends Pick<VariantProps<typeof tabPillVariants>, "variant" | "size"> {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  variant = "beige",
  size = "default",
}: TabsProps) {
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
                tabPillVariants({ variant, size, active: isActive })
              )}
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
