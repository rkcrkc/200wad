import Image from "next/image";
import Link from "next/link";
import {
  Award,
  ChevronRight,
  Coins,
  Lock,
  Medal,
  Trophy as TrophyIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AchievementForList } from "@/lib/queries/achievements";

interface TrophyCardProps {
  row: AchievementForList;
}

interface TierStyle {
  /** Border colour for the card frame */
  frameClass: string;
  /** Background tint for the icon medallion */
  medallionClass: string;
  /** Icon colour */
  iconColor: string;
  /** Label shown beneath the title for the tier */
  label: string;
}

const TIER_STYLES: Record<
  Exclude<AchievementForList["tier"], null>,
  TierStyle
> = {
  bronze: {
    frameClass: "border-[#c97f3a]/30",
    medallionClass: "bg-[#c97f3a]/12",
    iconColor: "#c97f3a",
    label: "Bronze",
  },
  silver: {
    frameClass: "border-[#a5a5a5]/40",
    medallionClass: "bg-[#a5a5a5]/15",
    iconColor: "#7a7a7a",
    label: "Silver",
  },
  gold: {
    frameClass: "border-[#e0aa3e]/40",
    medallionClass: "bg-[#e0aa3e]/15",
    iconColor: "#b8861f",
    label: "Gold",
  },
  platinum: {
    frameClass: "border-[#6f8aa4]/40",
    medallionClass: "bg-[#6f8aa4]/15",
    iconColor: "#6f8aa4",
    label: "Platinum",
  },
};

const DEFAULT_FRAME_CLASS = "border-primary/20";
const DEFAULT_MEDALLION_CLASS = "bg-primary/10";
const DEFAULT_ICON_COLOR = "#0b6cff";

function formatUnlockedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TrophyCard({ row }: TrophyCardProps) {
  const showMystery = row.isMystery && !row.isUnlocked;

  const tierStyle = row.tier ? TIER_STYLES[row.tier] : null;
  const frameClass = tierStyle?.frameClass ?? DEFAULT_FRAME_CLASS;
  const medallionClass = tierStyle?.medallionClass ?? DEFAULT_MEDALLION_CLASS;
  const iconColor = tierStyle?.iconColor ?? DEFAULT_ICON_COLOR;
  const tierLabel = tierStyle?.label ?? null;

  // Lucide icon by tier — platinum gets Medal, others get Award. Mystery uses
  // TrophyIcon as a neutral placeholder, locked-no-tier uses Award too.
  const Icon = showMystery
    ? TrophyIcon
    : row.tier === "platinum"
      ? Medal
      : Award;

  const showProgress =
    !row.isUnlocked &&
    !showMystery &&
    row.currentProgress !== null &&
    row.progressThreshold !== null;

  const progressPercent = showProgress
    ? Math.min(
        100,
        Math.round(((row.currentProgress as number) / (row.progressThreshold as number)) * 100)
      )
    : 0;

  // Slug-specific embellishment: when the first_word_learned trophy is
  // unlocked, swap the standard footer for a small thumbnail of the actual
  // word the user learned first.
  const firstWord = row.extra.firstWord;
  const showFirstWordThumb =
    row.isUnlocked && row.slug === "first_word_learned" && firstWord;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border-[1.5px] bg-white p-5 transition-colors",
        row.isUnlocked ? frameClass : "border-gray-100"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
            row.isUnlocked ? medallionClass : "bg-gray-50"
          )}
        >
          {showMystery ? (
            <Lock className="h-6 w-6 text-gray-400" strokeWidth={1.67} />
          ) : (
            <Icon
              className="h-7 w-7"
              strokeWidth={1.67}
              style={{ color: row.isUnlocked ? iconColor : "#9ca3af" }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-regular-semibold text-foreground">
            {showMystery ? "???" : row.title}
          </h3>
          {tierLabel && !showMystery && (
            <p className="mt-0.5 text-xs-medium text-muted-foreground">
              {tierLabel}
            </p>
          )}
          {!showMystery && (
            <p className="mt-1 text-[13px] leading-[1.4] text-muted-foreground">
              {row.description}
            </p>
          )}
          {showMystery && (
            <p className="mt-1 text-[13px] leading-[1.4] text-muted-foreground">
              Hidden trophy — unlock to reveal.
            </p>
          )}
        </div>
      </div>

      {/* Footer: unlocked state, coin reward, or progress strip */}
      <div className="mt-4 flex flex-col gap-2">
        {row.isUnlocked && row.unlockedAt && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs-medium text-muted-foreground">
              Unlocked {formatUnlockedDate(row.unlockedAt)}
            </span>
            {row.coinReward > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs-medium text-warning">
                <Coins className="h-3 w-3" strokeWidth={2} />
                {row.coinReward}
              </span>
            )}
          </div>
        )}

        {showFirstWordThumb && firstWord && (
          <Link
            href={`/trophies?word=${firstWord.id}`}
            scroll={false}
            className="group mt-1 flex items-center gap-3 overflow-hidden rounded-xl bg-bone pr-2 transition-colors hover:bg-bone-hover"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
              {firstWord.imageUrl ? (
                <Image
                  src={firstWord.imageUrl}
                  alt={firstWord.headword}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs-medium text-muted-foreground">
                  {firstWord.headword.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-small-semibold text-foreground">
                {firstWord.headword}
              </p>
              <p className="truncate text-xs-medium text-muted-foreground">
                {firstWord.english}
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-gray-600"
              strokeWidth={1.67}
            />
          </Link>
        )}

        {!row.isUnlocked && !showMystery && row.coinReward > 0 && (
          <div className="inline-flex items-center gap-1 self-start rounded-full bg-gray-50 px-2 py-0.5 text-xs-medium text-muted-foreground">
            <Coins className="h-3 w-3" strokeWidth={2} />
            {row.coinReward} on unlock
          </div>
        )}

        {showProgress && (
          <div>
            <div className="flex items-center justify-between text-xs-medium text-muted-foreground">
              <span>
                {row.currentProgress} / {row.progressThreshold}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
