"use client";

import { Gift, CreditCard, Sparkles } from "lucide-react";

interface CreditTransaction {
  id: string;
  type: "referral" | "payment" | "bonus";
  description: string;
  date: string;
  amountCents: number;
}

const DUMMY_TRANSACTIONS: CreditTransaction[] = [
  {
    id: "1",
    type: "referral",
    description: "Referral bonus: sarah_martinez signed up",
    date: "2026-01-15",
    amountCents: 400,
  },
  {
    id: "2",
    type: "payment",
    description: "Subscription payment applied",
    date: "2026-01-12",
    amountCents: -400,
  },
  {
    id: "3",
    type: "referral",
    description: "Referral bonus: john_davis signed up",
    date: "2026-01-10",
    amountCents: 400,
  },
  {
    id: "4",
    type: "bonus",
    description: "Sign-up bonus",
    date: "2026-01-08",
    amountCents: 200,
  },
  {
    id: "5",
    type: "referral",
    description: "Referral bonus: emma_wilson signed up",
    date: "2026-01-05",
    amountCents: 400,
  },
  {
    id: "6",
    type: "payment",
    description: "Subscription payment applied",
    date: "2026-01-01",
    amountCents: -800,
  },
];

function formatPrice(cents: number): string {
  const abs = Math.abs(cents);
  return `$${(abs / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TransactionIcon({ type }: { type: CreditTransaction["type"] }) {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "referral":
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
          <Gift className={`${iconClass} text-green-600`} />
        </div>
      );
    case "payment":
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <CreditCard className={`${iconClass} text-red-600`} />
        </div>
      );
    case "bonus":
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <Sparkles className={`${iconClass} text-blue-600`} />
        </div>
      );
  }
}

export function CreditsHistoryClient() {
  return (
    <div className="space-y-3">
      {DUMMY_TRANSACTIONS.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-3"
        >
          <TransactionIcon type={tx.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{tx.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(tx.date)}
            </p>
          </div>
          {tx.amountCents > 0 ? (
            <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
              +{formatPrice(tx.amountCents)}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              -{formatPrice(tx.amountCents)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
