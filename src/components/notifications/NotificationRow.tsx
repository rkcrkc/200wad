"use client";

import { useTransition } from "react";
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

  const data = (notification.data ?? null) as NotificationDataShape | null;
  const cta = data?.cta;
  const isCritical = data?.severity === "critical";

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
      {/* Status dot — the only signal we use to flag state:
          • unread + critical → red
          • unread (normal)   → blue
          • read              → grey
          The whole row toggles read/unread; this is just the visual indicator. */}
      <div className="mt-1.5 w-2 shrink-0">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            notification.is_read
              ? "bg-gray-300"
              : isCritical
                ? "bg-destructive"
                : "bg-primary"
          )}
          aria-label={
            notification.is_read
              ? "Read"
              : isCritical
                ? "Unread, critical"
                : "Unread"
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-small-semibold line-clamp-2 text-foreground">
            {notification.title}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.created_at)}
            </span>
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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggleRead}
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
    </div>
  );
}
