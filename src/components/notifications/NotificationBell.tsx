"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  fetchInbox,
  markAllAsRead,
  markNotificationsSeen,
} from "@/lib/mutations/notifications";
import type { Notification } from "@/types/database";
import { NotificationRow } from "./NotificationRow";

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  // The mobile full-page panel is portaled to <body>, so it lives outside
  // containerRef; the click-outside handler must exempt it explicitly.
  const mobilePanelRef = useRef<HTMLDivElement>(null);

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

  // When the panel opens: optimistically clear the badge, stamp
  // `notifications_last_seen_at`, then refresh the list. The badge represents
  // "new notifications since you last looked", so opening the panel clears it.
  // Per-row read state is untouched.
  useEffect(() => {
    if (!open) return;
    setUnreadCount(0);
    (async () => {
      await markNotificationsSeen();
      await refresh();
    })();
  }, [open, refresh]);

  // Click-outside to close (desktop dropdown + portaled mobile panel).
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (mobilePanelRef.current?.contains(target)) return;
      setOpen(false);
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

  // Lock body scroll while the full-page mobile panel is open. Gated on the
  // mobile breakpoint so the desktop dropdown never freezes page scrolling.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      document.body.style.overflow = mq.matches ? "hidden" : "";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on navigation so the full-page panel never lingers over a new route.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  // Count of items still individually marked unread — used to decide whether
  // to show the "Mark all as read" link. This is independent of the bell badge
  // (which counts notifications created since the user last opened the panel).
  const unreadItemsCount = items.reduce(
    (acc, n) => (n.is_read ? acc : acc + 1),
    0
  );

  const markAllButton =
    unreadItemsCount > 0 ? (
      <button
        type="button"
        onClick={handleMarkAllRead}
        disabled={isPending}
        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
      >
        Mark all as read
      </button>
    ) : null;

  const listBody =
    loading && items.length === 0 ? (
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
    );

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

      {/* Desktop: anchored dropdown. */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 hidden w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 md:block"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-small-semibold text-foreground">
              Notifications
              {unreadItemsCount > 0 && ` (${unreadItemsCount})`}
            </span>
            {markAllButton}
          </div>
          <div className="max-h-[400px] overflow-y-auto">{listBody}</div>
        </div>
      )}

      {/* Mobile: full-page scrollable modal (mirrors the mobile menu). */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={mobilePanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="fixed inset-0 z-50 flex flex-col bg-white md:hidden"
          >
            <div className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4">
              <span className="text-large-semibold text-foreground">
                Notifications
                {unreadItemsCount > 0 && ` (${unreadItemsCount})`}
              </span>
              <div className="flex shrink-0 items-center gap-3">
                {markAllButton}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all hover:bg-bone-hover"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {listBody}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
