"use client";

import { useState } from "react";
import { Copy, Check, Users, DollarSign, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReferralHistoryItem } from "@/lib/queries/credits";

interface ReferralsPageClientProps {
  referralCode: string | null;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalCreditsCents: number;
  availableCreditsCents: number;
  referralHistory: ReferralHistoryItem[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ReferralsPageClient({
  referralCode,
  totalReferrals,
  completedReferrals,
  pendingReferrals,
  totalCreditsCents,
  availableCreditsCents,
  referralHistory,
}: ReferralsPageClientProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${referralCode}`
    : null;

  function handleCopy() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Total Referrals"
          value={totalReferrals.toString()}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-orange-500" />}
          label="Pending"
          value={pendingReferrals.toString()}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          label="Credits Earned"
          value={formatPrice(totalCreditsCents)}
          href="/account/credits"
        />
      </div>

      {/* Referral link */}
      {referralLink && (
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <h2 className="mb-3 text-large-semibold">Your Referral Link</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
              {referralLink}
            </div>
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="mb-4 text-large-semibold">How It Works</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              1
            </div>
            <div>
              <p className="text-sm font-semibold">Share your link</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Send your unique referral link to friends via email, social media, or messaging apps
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              2
            </div>
            <div>
              <p className="text-sm font-semibold">They sign up</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your friend creates an account using your referral link and starts learning
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              3
            </div>
            <div>
              <p className="text-sm font-semibold">Earn credits</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                You earn 4 credits when they complete their first lesson. Credits can be used towards your subscription!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="mb-4 text-large-semibold">Recent Referrals</h2>
        {referralHistory.length > 0 ? (
          <div className="space-y-3">
            {referralHistory.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                  {referral.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {referral.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(referral.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {referral.status === "completed" ? (
                  <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                    +{formatPrice(referral.creditAmountCents)} credits
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-500">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              No referrals yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Share your link to start earning credits
            </p>
          </div>
        )}
      </div>

      {/* Credit balance */}
      {availableCreditsCents > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-sm text-green-700">Available Credit Balance</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">
            {formatPrice(availableCreditsCents)}
          </p>
          <p className="mt-2 text-xs text-green-600">
            This credit will be automatically applied to your next subscription payment.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="mb-2">{icon}</div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {href && (
        <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="relative rounded-xl bg-white p-4 shadow-card transition-colors hover:bg-bone-hover"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="relative rounded-xl bg-white p-4 shadow-card">
      {content}
    </div>
  );
}
