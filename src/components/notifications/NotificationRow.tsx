"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/helpers";
import {
  markAsRead,
  markAsUnread,
  dismissNotification,
} from "@/lib/mutations/notifications";
import type { Notification } from "@/types/database";

interface NotificationRowProps {
  notification: Notification;
  onAction?: () => void;
}

interface NotificationCta {
  label: string;
  href: string;
}

interface NotificationDataShape {
  cta?: NotificationCta;
  // `severity` is stored as a string for backward compat with previously
  // seeded templates that may have "info" / "warning" / "critical". Render
  // logic only treats "critical" specially — anything else is normal.
  severity?: "info" | "warning" | "critical" | string;
}

export function NotificationRow({ notification, onAction }: NotificationRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the context menu on outside click or Escape.
  useEffect(() => {
    if (!menuPos) return;
    const close = () => setMenuPos(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuPos(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuPos]);

  const data = (notification.data ?? null) as NotificationDataShape | null;
  const cta = data?.cta;
  const isCritical = data?.severity === "critical";

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Clamp so the menu stays inside the viewport (menu ~180×72 with 2 items).
    const menuW = 180;
    const menuH = 72;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setMenuPos({ x, y });
  };

  const runDismiss = () => {
    startTransition(async () => {
      const res = await dismissNotification(notification.id);
      if (!res.success) {
        toast.error(res.error ?? "Failed to dismiss");
        return;
      }
      router.refresh();
      onAction?.();
    });
  };

  const handleToggleRead = () => {
    startTransition(async () => {
      const res = notification.is_read
        ? await markAsUnread(notification.id)
        : await markAsRead(notification.id);
      if (!res.success) {
        toast.error(
          res.error ??
            (notification.is_read
              ? "Failed to mark as unread"
              : "Failed to mark as read")
        );
        return;
      }
      router.refresh();
      onAction?.();
    });
  };

  const handleToggleReadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleToggleRead();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startTransition(async () => {
      const res = await dismissNotification(notification.id);
      if (!res.success) {
        toast.error(res.error ?? "Failed to dismiss");
        return;
      }
      router.refresh();
      onAction?.();
    });
  };

  const Body = (
    <div className="group/row relative flex gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "line-clamp-2 text-foreground",
              notification.is_read ? "text-small-regular" : "text-small-semibold"
            )}
          >
            {notification.title}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.created_at)}
            </span>
            {/* Status dot — click to toggle read/unread:
                • unread + critical → red
                • unread (normal)   → blue
                • read              → grey */}
            <button
              type="button"
              onClick={handleToggleReadClick}
              disabled={isPending}
              aria-label={notification.is_read ? "Mark as unread" : "Mark as read"}
              className="flex h-5 w-5 items-center justify-center rounded-md transition-colors hover:bg-bone-hover"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  notification.is_read
                    ? "bg-gray-300"
                    : isCritical
                      ? "bg-destructive"
                      : "bg-primary"
                )}
              />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isPending}
              aria-label="Dismiss notification"
              className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bone-hover hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">
          {notification.message}
        </p>
        {cta && (
          <span className="mt-1 inline-block text-xs font-medium text-primary">
            {cta.label} →
          </span>
        )}
      </div>
    </div>
  );

  const menu =
    mounted && menuPos
      ? createPortal(
          <div
            role="menu"
            style={{ position: "fixed", top: menuPos.y, left: menuPos.x }}
            className="z-[60] min-w-[180px] overflow-hidden rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/5"
            // Prevent the outer document-level mousedown handlers (e.g. the
            // notification bell's click-outside) from firing while the user
            // interacts with this menu — otherwise the dropdown closes.
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => {
                setMenuPos(null);
                handleToggleRead();
              }}
              className="block w-full px-3 py-1.5 text-left text-small-regular text-foreground hover:bg-bone-hover disabled:opacity-50"
            >
              {notification.is_read ? "Mark as unread" : "Mark as read"}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => {
                setMenuPos(null);
                runDismiss();
              }}
              className="block w-full px-3 py-1.5 text-left text-small-regular text-foreground hover:bg-bone-hover disabled:opacity-50"
            >
              Clear notification
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggleRead}
      onContextMenu={handleContextMenu}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggleRead();
        }
      }}
      aria-label={
        notification.is_read ? "Mark as unread" : "Mark as read"
      }
      aria-disabled={isPending}
      className="block w-full cursor-pointer text-left"
    >
      {Body}
      {menu}
    </div>
  );
}
