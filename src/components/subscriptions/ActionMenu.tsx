"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

export interface ActionMenuItem {
  label: string;
  /** Click handler for button items. Ignored when `href` is set. */
  onClick?: () => void;
  /** Render a navigation link instead of a button. */
  href?: string;
  /** Optional leading icon shown before the label. */
  icon?: ReactNode;
  /** Render in the destructive colour (e.g. Cancel plan). */
  destructive?: boolean;
  /** Greyed out and non-clickable; pair with `title` to explain why. */
  disabled?: boolean;
  /** Native tooltip, typically the reason a disabled item can't be used. */
  title?: string;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Accessible label for the trigger. */
  label?: string;
}

/**
 * Ellipsis trigger + click-outside dropdown of plan actions. Opens above or
 * below depending on menu placement is left to the browser (fixed small menu).
 */
export function ActionMenu({ items, label = "Plan actions" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-beige hover:text-foreground"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => {
            const className = `flex w-full items-center gap-2 px-4 py-2.5 text-left text-small-medium transition-colors hover:bg-bone-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${
              item.destructive ? "text-destructive" : "text-foreground"
            }`;

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  title={item.title}
                  onClick={() => setOpen(false)}
                  className={className}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                title={item.title}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={className}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
