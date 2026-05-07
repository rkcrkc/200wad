"use client";

import { useMemo, type ReactNode } from "react";
import { Share2, X } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CelebrationTier = "medium" | "major";

export interface CelebrationStat {
  label: string;
  value: string | number;
}

export interface CelebrationCTA {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface CelebrationModalProps {
  tier: CelebrationTier;
  /** Headline shown big at top, e.g. "Lesson mastered!" */
  title: string;
  /** Smaller line above the title, e.g. "Lesson 5 · Animals" */
  eyebrow?: string;
  /** Optional emoji rendered above the title (e.g. 🏆 / ⭐ / 🎉) */
  emoji?: string;
  /** Optional flag/image */
  flagEmoji?: string;
  /** Optional supporting copy under title */
  subtitle?: string;
  /** Stats grid */
  stats?: CelebrationStat[];
  /** Optional custom body content (rendered below stats) */
  children?: ReactNode;
  /** CTAs in priority order */
  primaryCta?: CelebrationCTA;
  secondaryCta?: CelebrationCTA;
  tertiaryCta?: CelebrationCTA;
  /** If true, includes a share button */
  shareable?: boolean;
  onShare?: () => void;
  onDismiss: () => void;
}

const ACCENT_BY_TIER: Record<CelebrationTier, { bg: string; text: string; ring: string }> = {
  medium: {
    bg: "bg-primary/10",
    text: "text-primary",
    ring: "ring-primary/20",
  },
  major: {
    bg: "bg-success/10",
    text: "text-success",
    ring: "ring-success/30",
  },
};

export function CelebrationModal({
  tier,
  title,
  eyebrow,
  emoji,
  flagEmoji,
  subtitle,
  stats,
  children,
  primaryCta,
  secondaryCta,
  tertiaryCta,
  shareable,
  onShare,
  onDismiss,
}: CelebrationModalProps) {
  const accent = ACCENT_BY_TIER[tier];
  const isMajor = tier === "major";

  return (
    <ModalShell maxWidth={isMajor ? "content-md" : "content-sm"}>
      <div className="relative">
        {isMajor && <ConfettiOverlay />}

        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-foreground/40 transition-colors hover:bg-black/5 hover:text-foreground/70"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Hero */}
        <div
          className={cn(
            "relative px-8 pb-8 pt-12 text-center",
            isMajor ? "bg-success/5" : "bg-primary/5",
          )}
        >
          {flagEmoji && (
            <div className="mb-3 text-5xl" aria-hidden>
              {flagEmoji}
            </div>
          )}
          {emoji && (
            <div
              className={cn(
                "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl ring-8",
                accent.bg,
                accent.ring,
              )}
              aria-hidden
            >
              {emoji}
            </div>
          )}
          {eyebrow && (
            <p className="mb-2 text-xs-medium uppercase tracking-wide text-foreground/60">
              {eyebrow}
            </p>
          )}
          <h2
            className={cn(
              isMajor ? "text-page-header" : "text-xxl-bold",
              accent.text,
            )}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-md text-regular-semibold text-foreground/70">
              {subtitle}
            </p>
          )}
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="border-t border-border px-8 py-6">
            <StatsGrid stats={stats} />
          </div>
        )}

        {/* Optional custom body */}
        {children && (
          <div className="border-t border-border px-8 py-6">{children}</div>
        )}

        {/* CTAs */}
        <div className="space-y-3 bg-bone px-8 py-6">
          {primaryCta && (
            <PrimaryButton
              fullWidth
              {...(primaryCta.href
                ? { href: primaryCta.href }
                : { onClick: primaryCta.onClick })}
            >
              {primaryCta.label}
            </PrimaryButton>
          )}
          {secondaryCta && (
            <PrimaryButton
              fullWidth
              variant="outline"
              {...(secondaryCta.href
                ? { href: secondaryCta.href }
                : { onClick: secondaryCta.onClick })}
            >
              {secondaryCta.label}
            </PrimaryButton>
          )}
          <div className="flex items-center justify-between gap-2">
            {tertiaryCta && (
              <Button
                variant="ghost"
                onClick={tertiaryCta.onClick}
                className="text-foreground/60"
              >
                {tertiaryCta.label}
              </Button>
            )}
            {shareable && (
              <Button variant="ghost" onClick={onShare} className="ml-auto gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function StatsGrid({ stats }: { stats: CelebrationStat[] }) {
  const cols =
    stats.length <= 2
      ? "grid-cols-2"
      : stats.length === 3
        ? "grid-cols-3"
        : "grid-cols-2 md:grid-cols-4";
  return (
    <div className={cn("grid gap-4", cols)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl bg-white px-4 py-3 ring-1 ring-border"
        >
          <p className="text-xl-semibold text-foreground">{stat.value}</p>
          <p className="mt-0.5 text-xs-medium text-foreground/60">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Lightweight CSS-only confetti for major celebrations.
 * Renders 28 colored squares falling/rotating from random horizontal positions.
 */
function ConfettiOverlay() {
  const colors = ["#0b6cff", "#00c950", "#ff9224", "#fb2c36", "#a855f7", "#facc15"];
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 1.4 + Math.random() * 1.2,
        rotate: Math.random() * 360,
        color: colors[i % colors.length],
      })),
    // colors is static; only generate once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <style>{`
        .confetti-piece {
          position: absolute;
          top: -12px;
          width: 8px;
          height: 14px;
          opacity: 0.9;
          border-radius: 1px;
          animation-name: confetti-fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
          animation-iteration-count: 1;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
