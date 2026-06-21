"use client";

import { createElement, useState, useTransition } from "react";
import { Coins } from "lucide-react";
import {
  coinTypeIcon,
  type CoinHistoryEntry,
  type CoinTotals,
} from "@/lib/coins";
import { loadMoreCoinHistoryAction } from "@/lib/mutations/coins";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface CoinHistoryProps {
  initialEntries: CoinHistoryEntry[];
  hasMore: boolean;
  totals: CoinTotals;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EntryIcon({ type, amount }: { type: string; amount: number }) {
  const icon = coinTypeIcon(type);
  const isDebit = amount < 0;
  const bg = isDebit ? "bg-red-100" : "bg-green-100";
  const fg = isDebit ? "text-red-600" : "text-green-600";
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}
    >
      {createElement(icon, { className: `h-4 w-4 ${fg}` })}
    </div>
  );
}

export function CoinHistory({
  initialEntries,
  hasMore,
  totals,
}: CoinHistoryProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [more, setMore] = useState(hasMore);
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No coin activity yet"
        description="Earn coins by taking tests, then spend them here."
      />
    );
  }

  function handleLoadMore() {
    startTransition(async () => {
      const page = await loadMoreCoinHistoryAction(entries.length);
      setEntries((prev) => [...prev, ...page.entries]);
      setMore(page.hasMore);
    });
  }

  const cell = "bg-white px-4 py-3";

  return (
    <div className="pb-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] table-fixed border-separate border-spacing-0">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-32" />
          </colgroup>
          <thead>
            <tr className="cursor-default whitespace-nowrap">
              <th className="px-4 py-3 text-left text-xs-medium text-muted-foreground">
                Activity
              </th>
              <th className="px-4 py-3 text-right text-xs-medium text-muted-foreground">
                Earned
              </th>
              <th className="px-4 py-3 text-right text-xs-medium text-muted-foreground">
                Spent
              </th>
              <th className="px-4 py-3 pr-6 text-right text-xs-medium text-muted-foreground">
                Running total
              </th>
            </tr>
          </thead>
          <tbody className="shadow-card [&>tr:first-child>td:first-child]:rounded-tl-xl [&>tr:first-child>td:last-child]:rounded-tr-xl [&>tr:last-child>td:first-child]:rounded-bl-xl [&>tr:last-child>td:last-child]:rounded-br-xl">
            {entries.map((entry, i) => {
              const divider = i > 0 && "border-t border-bone-hover";
              return (
                <tr key={entry.id}>
                  <td className={cn(cell, divider)}>
                    <div className="flex items-center gap-3">
                      <EntryIcon type={entry.type} amount={entry.amount} />
                      <div className="min-w-0">
                        <p className="truncate text-regular-medium text-foreground">
                          {entry.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(cell, "text-right", divider)}>
                    {entry.amount > 0 && (
                      <span className="text-regular-medium text-green-600">
                        +{formatNumber(entry.amount)}
                      </span>
                    )}
                  </td>
                  <td className={cn(cell, "text-right", divider)}>
                    {entry.amount < 0 && (
                      <span className="text-regular-medium text-red-600">
                        −{formatNumber(Math.abs(entry.amount))}
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      cell,
                      "pr-6 text-right text-regular-medium text-foreground",
                      divider
                    )}
                  >
                    {formatNumber(entry.balanceAfter)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {more && (
        <div className="pt-3">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-regular-medium text-foreground/75 transition-colors hover:text-foreground disabled:opacity-60"
          >
            {isPending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {/* Floating totals bar — pinned to the bottom of the scroll area; all-time
          figures aligned to the table columns: Earned / Spent under their
          columns, net balance under Running total. */}
      <div className="sticky bottom-0 z-10 mt-3 flex items-center rounded-2xl bg-bone-hover shadow-xl">
        <div className="min-w-0 flex-1 px-4 py-3">
          <span className="text-medium-semibold text-foreground">Total</span>
        </div>
        <div className="w-28 shrink-0 px-4 py-3 text-right">
          <p className="text-xs text-muted-foreground">Earned</p>
          <p className="text-regular-medium text-green-600">
            +{formatNumber(totals.earned)}
          </p>
        </div>
        <div className="w-28 shrink-0 px-4 py-3 text-right">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-regular-medium text-red-600">
            −{formatNumber(totals.spent)}
          </p>
        </div>
        <div className="w-32 shrink-0 px-4 py-3 pr-6 text-right">
          <p className="text-xs text-muted-foreground">Balance</p>
          <div className="flex items-center justify-end gap-1.5">
            <Coins className="h-4 w-4 text-amber-500" strokeWidth={1.67} />
            <span className="text-regular-medium text-foreground">
              {formatNumber(totals.net)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
