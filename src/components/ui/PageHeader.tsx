"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionMenu, type ActionMenuItem } from "@/components/subscriptions/ActionMenu";
import { cn } from "@/lib/utils";

/** String icon keys keep actions serialisable so server pages can pass them. */
type PageHeaderIcon = "arrow-right" | "globe" | "credit-card";

export interface PageHeaderAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: PageHeaderIcon;
  destructive?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: PageHeaderAction[];
  className?: string;
}

const iconMap: Record<PageHeaderIcon, typeof ArrowRight> = {
  "arrow-right": ArrowRight,
  globe: Globe,
  "credit-card": CreditCard,
};

function renderIcon(icon?: PageHeaderIcon) {
  if (!icon) return null;
  const Icon = iconMap[icon];
  return <Icon className="h-4 w-4" />;
}

/**
 * Page title row with optional trailing actions. Actions render inline as ghost
 * buttons on desktop and collapse into a "…" kebab menu on mobile. Pass an empty
 * `actions` array (or omit it) to render just the title/subtitle.
 */
export function PageHeader({
  title,
  subtitle,
  actions = [],
  className,
}: PageHeaderProps) {
  const menuItems: ActionMenuItem[] = actions.map((action) => ({
    label: action.label,
    href: action.href,
    onClick: action.onClick,
    icon: renderIcon(action.icon),
    destructive: action.destructive,
  }));

  return (
    <div
      className={cn(
        "mb-8 flex items-start justify-between gap-4",
        className
      )}
    >
      <div>
        <h1 className="mb-2 text-page-header text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      {actions.length > 0 && (
        <>
          {/* Desktop: inline ghost buttons */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {actions.map((action) =>
              action.href ? (
                <Button
                  key={action.label}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "shrink-0 gap-1.5",
                    action.destructive && "text-destructive"
                  )}
                >
                  <Link href={action.href}>
                    {renderIcon(action.icon)}
                    {action.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  key={action.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={action.onClick}
                  className={cn(
                    "shrink-0 gap-1.5",
                    action.destructive && "text-destructive"
                  )}
                >
                  {renderIcon(action.icon)}
                  {action.label}
                </Button>
              )
            )}
          </div>

          {/* Mobile: kebab menu */}
          <div className="shrink-0 md:hidden">
            <ActionMenu items={menuItems} label="Page actions" />
          </div>
        </>
      )}
    </div>
  );
}
