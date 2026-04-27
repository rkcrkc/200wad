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
  severity?: "info" | "warning" | "critical";
}

const TYPE_DOT: Record<string, string> = {
  system: "bg-muted-foreground",
  billing: "bg-warning",
  learning: "bg-success",
  reminder: "bg-primary",
  achievement: "bg-warning",
  content: "bg-primary",
  admin: "bg-foreground",
};

export function NotificationRow({ notification, onAction }: NotificationRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const data = (notification.data ?? null) as NotificationDataShape | null;
  const cta = data?.cta;
  const severity = data?.severity;

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

  const dotClass = TYPE_DOT[notification.type] ?? "bg-muted-foreground";
  const Body = (
    <div
      className={cn(
        "group/row relative flex gap-3 px-4 py-3 transition-colors hover:bg-bone",
        !notification.is_read && "bg-bone/40"
      )}
    >
      {/* Type indicator + unread dot stack */}
      <div className="mt-1 flex shrink-0 flex-col items-center gap-1">
        <div className={cn("h-2 w-2 rounded-full", dotClass)} />
        {!notification.is_read && (
          <div className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "text-small-semibold text-foreground line-clamp-2",
              severity === "critical" && "text-destructive"
            )}
          >
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
