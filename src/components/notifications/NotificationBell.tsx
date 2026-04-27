"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchInbox,
  markAllAsRead,
} from "@/lib/mutations/notifications";
import type { Notification } from "@/types/database";
import { NotificationRow } from "./NotificationRow";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInbox(20);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial unread count fetch on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when the dropdown opens (so it's never stale).
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllAsRead();
      if (!res.success) {
        toast.error(res.error ?? "Failed to mark all as read");
        return;
      }
      await refresh();
      router.refresh();
    });
  };

  const badgeLabel =
    unreadCount === 0 ? null : unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-all hover:bg-bone-hover",
          open && "bg-bone-hover"
        )}
      >
        <Bell className="h-5 w-5 text-muted-foreground" strokeWidth={1.67} />
        {badgeLabel && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white",
              badgeLabel.length > 1 && "px-1"
            )}
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-small-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell
                  className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60"
                  strokeWidth={1.5}
                />
                <p className="text-xs text-muted-foreground">
                  You&apos;re all caught up.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationRow
                      notification={n}
                      onAction={() => {
                        // Optimistic local refresh after action.
                        refresh();
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
