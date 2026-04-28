"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/helpers";
import {
  markAsRead,
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

  const handleMarkRead = () => {
    if (notification.is_read) return;
    startTransition(async () => {
      const res = await markAsRead(notification.id);
      if (!res.success) {
        toast.error(res.error ?? "Failed to mark as read");
      }
      router.refresh();
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

  const handleRowClick = () => {
    handleMarkRead();
    onAction?.();
  };

  const Body = (
    <div
      className={cn(
        "group/row relative flex gap-3 px-4 py-3 transition-colors hover:bg-bone",
        !notification.is_read && "bg-bone"
      )}
    >
      {/* Status dot — the only signal we use to flag state:
          • unread + critical → red
          • unread (normal)   → blue
          • read              → grey
          A fixed 8px rail keeps title alignment consistent across rows. */}
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
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">
          {notification.message}
        </p>
        {cta && (
          <span className="mt-1 inline-block text-xs font-medium text-primary group-hover/row:underline">
            {cta.label} →
          </span>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bone-hover hover:text-foreground group-hover/row:flex"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  if (cta) {
    return (
      <Link href={cta.href} onClick={handleRowClick} className="block">
        {Body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleRowClick}
      className="block w-full text-left"
    >
      {Body}
    </button>
  );
}
