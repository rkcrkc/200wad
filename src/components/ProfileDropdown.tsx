"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Coins, CreditCard, LogOut, Settings, UserPen } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { createClient } from "@/lib/supabase/client";
import { LevelBadge } from "@/components/levels/LevelBadge";
import { XpBadge } from "@/components/ui/xp-badge";

/** Gap kept between the dropdown's bottom edge and the viewport bottom. */
const VIEWPORT_BOTTOM_GAP = 16;

/**
 * Account menu shown on hover/focus of the header avatar. Mirrors the
 * interaction model and styling of {@link CourseDropdown}: hover to open,
 * short close delay so the pointer can travel into the panel, Escape to close.
 * Only rendered for real logged-in users (guests keep the static avatar).
 */
export function ProfileDropdown() {
  const router = useRouter();
  const { user, avatarUrl, displayName } = useUser();
  const [open, setOpen] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current rank + lifetime XP, fetched lazily the first time the menu opens so
  // it stays off the hot path for the (common) case where the avatar is never
  // clicked. Read from the user's own row (RLS-scoped) plus the enabled `levels`
  // ladder for the held tier's name/colour.
  const [rank, setRank] = useState<{
    name: string;
    color: string;
    lifetimeXp: number;
  } | null>(null);
  const rankFetchedRef = useRef(false);

  useEffect(() => {
    if (!open || rankFetchedRef.current || !user) return;
    rankFetchedRef.current = true;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: userRow } = await supabase
        .from("users")
        .select("lifetime_xp, current_level")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !userRow) return;
      const { data: levelRow } = await supabase
        .from("levels")
        .select("name, color")
        .eq("level_number", userRow.current_level ?? 1)
        .eq("enabled", true)
        .maybeSingle();
      if (cancelled || !levelRow) return;
      setRank({
        name: levelRow.name,
        color: levelRow.color,
        lifetimeXp: userRow.lifetime_xp ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  // Prefer the profile name; fall back to the email local part, then a generic
  // label so the header always has something to show.
  const name = displayName?.trim() || user?.email || "Account";
  const initial = (displayName?.trim() || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  // Bound the panel so its bottom sits just above the viewport bottom; the
  // inner content then scrolls internally if it ever exceeds that.
  useEffect(() => {
    if (!open) return;
    function recompute() {
      const panel = panelRef.current;
      if (!panel) return;
      const top = panel.getBoundingClientRect().top;
      setMaxHeight(window.innerHeight - top - VIEWPORT_BOTTOM_GAP);
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [open]);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger — the avatar. Click toggles the panel so touch devices (no
          hover) can still reach the menu. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-12 shrink-0 items-center px-3"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #2b7fff 0%, #ad46ff 100%)",
            }}
          >
            <span className="text-sm leading-5 font-normal tracking-[-0.15px] text-white">
              {initial}
            </span>
          </div>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 flex min-w-[240px] flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
          style={maxHeight ? { maxHeight } : undefined}
        >
          {/* Header: avatar + display name */}
          <div className="flex shrink-0 items-center gap-3 px-4 py-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #2b7fff 0%, #ad46ff 100%)",
                }}
              >
                <span className="text-base leading-none font-normal text-white">
                  {initial}
                </span>
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-foreground truncate text-[15px] leading-[1.35] font-semibold tracking-[-0.225px]">
                {name}
              </span>
              {rank && (
                <div className="flex items-center gap-2">
                  <LevelBadge name={rank.name} color={rank.color} size="sm" />
                  <XpBadge value={rank.lifetimeXp} variant="default" size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-gray-100 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate("/profile")}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bone-hover"
            >
              <UserPen
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.67}
              />
              <span className="text-foreground text-[14px] font-medium">
                Profile
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate("/settings")}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bone-hover"
            >
              <Settings
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.67}
              />
              <span className="text-foreground text-[14px] font-medium">
                Settings
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate("/account/subscriptions")}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bone-hover"
            >
              <CreditCard
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.67}
              />
              <span className="text-foreground text-[14px] font-medium">
                Subscriptions
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate("/referrals")}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bone-hover"
            >
              <Coins
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.67}
              />
              <span className="text-foreground text-[14px] font-medium">
                Credits
              </span>
            </button>

            <div className="my-1 h-px bg-gray-100" role="separator" />

            <form action="/auth/logout" method="post">
              <button
                type="submit"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bone-hover"
              >
                <LogOut
                  className="h-4 w-4 text-muted-foreground"
                  strokeWidth={1.67}
                />
                <span className="text-foreground text-[14px] font-medium">
                  Log out
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
