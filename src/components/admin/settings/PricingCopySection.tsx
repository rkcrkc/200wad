"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminModal } from "@/components/admin/AdminModal";
import { updatePricingTierCopy } from "@/lib/mutations/admin/pricing";
import type { PricingTierCopyRow } from "@/lib/queries/subscriptions";

interface PricingCopySectionProps {
  copy: PricingTierCopyRow[];
}

/** Count tokens each tier's benefits may reference, shown as an editor hint. */
const TIER_TOKENS: Record<string, string[]> = {
  free: ["{freeLessons}"],
  course: ["{lessons}", "{words}"],
  language: ["{courses}", "{lessons}", "{words}"],
  "all-languages": ["{languages}", "{courses}", "{lessons}", "{words}"],
};

/** Tokens the subscription-page "Access" line may reference, per tier. */
const ACCESS_TOKENS: Record<string, string[]> = {
  free: ["{freeLessons}"],
  course: [],
  language: ["{language}", "{otherLanguages}", "{freeLessons}"],
  "all-languages": ["{languages}"],
};

function tierLabel(tier: string): string {
  if (tier === "all-languages") return "All Languages";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

const BENEFIT_KEYS = [
  "benefit_1",
  "benefit_2",
  "benefit_3",
  "benefit_4",
  "benefit_5",
] as const;

export function PricingCopySection({ copy }: PricingCopySectionProps) {
  const [rows, setRows] = useState(copy);
  const [editing, setEditing] = useState<PricingTierCopyRow | null>(null);

  async function handleSave(updated: PricingTierCopyRow) {
    const result = await updatePricingTierCopy({
      tier_key: updated.tier_key as "free" | "course" | "language" | "all-languages",
      audience: updated.audience ?? "",
      access: updated.access ?? "",
      access_subtext: updated.access_subtext ?? "",
      benefit_1: updated.benefit_1 ?? "",
      benefit_2: updated.benefit_2 ?? "",
      benefit_3: updated.benefit_3 ?? "",
      benefit_4: updated.benefit_4 ?? "",
      benefit_5: updated.benefit_5 ?? "",
    });
    if (result.success) {
      setRows((prev) =>
        prev.map((r) => (r.tier_key === updated.tier_key ? updated : r))
      );
      setEditing(null);
    } else {
      alert(result.error || "Failed to save copy.");
    }
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Upgrade Modal Copy
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Edit the audience line, subscription-page access line, and benefit
          bullets shown on each plan card. Plan titles and prices stay automatic.
        </p>
      </div>

      <div className="divide-y divide-bone-hover overflow-hidden rounded-xl bg-white">
        {rows.map((row) => {
          const benefits = BENEFIT_KEYS.map((k) => row[k]).filter(
            (b): b is string => !!b
          );
          return (
            <div
              key={row.tier_key}
              className="flex items-start justify-between gap-4 px-6 py-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {tierLabel(row.tier_key)}
                </div>
                <div className="text-xs text-gray-500">
                  {row.audience || "No audience line"}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {benefits.length} benefit{benefits.length === 1 ? "" : "s"}
                </div>
              </div>
              <button
                onClick={() => setEditing(row)}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                Edit copy
              </button>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditCopyModal
          row={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleSave}
        />
      )}
    </section>
  );
}

// ============================================================================
// Edit Copy Modal
// ============================================================================

function EditCopyModal({
  row,
  onClose,
  onSubmit,
}: {
  row: PricingTierCopyRow;
  onClose: () => void;
  onSubmit: (updated: PricingTierCopyRow) => void;
}) {
  const [audience, setAudience] = useState(row.audience ?? "");
  const [access, setAccess] = useState(row.access ?? "");
  const [accessSubtext, setAccessSubtext] = useState(row.access_subtext ?? "");
  const [benefits, setBenefits] = useState<string[]>(
    BENEFIT_KEYS.map((k) => row[k] ?? "")
  );

  const tokens = TIER_TOKENS[row.tier_key] ?? [];
  const accessTokens = ACCESS_TOKENS[row.tier_key] ?? [];
  // The "Access" line only appears in the subscription-page header for the
  // free / language / all-languages plans (there is no course-plan header).
  const showAccess = row.tier_key !== "course";

  function setBenefit(index: number, value: string) {
    setBenefits((prev) => prev.map((b, i) => (i === index ? value : b)));
  }

  function handleSubmit() {
    onSubmit({
      tier_key: row.tier_key,
      audience: audience.trim() || null,
      access: access.trim() || null,
      access_subtext: accessSubtext.trim() || null,
      benefit_1: benefits[0]?.trim() || null,
      benefit_2: benefits[1]?.trim() || null,
      benefit_3: benefits[2]?.trim() || null,
      benefit_4: benefits[3]?.trim() || null,
      benefit_5: benefits[4]?.trim() || null,
    });
  }

  return (
    <AdminModal
      isOpen={true}
      onClose={onClose}
      title={`Edit ${tierLabel(row.tier_key)} Copy`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {tokens.length > 0 && (
          <p className="rounded-lg bg-bone px-3 py-2 text-xs text-gray-600">
            Available tokens:{" "}
            {tokens.map((t, i) => (
              <span key={t}>
                {i > 0 && ", "}
                <code className="rounded bg-white px-1 py-0.5 text-gray-800">
                  {t}
                </code>
              </span>
            ))}
            . They&apos;re replaced with live content totals.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Audience line
          </label>
          <input
            type="text"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="For focused learners"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {showAccess && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Access line
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              Shown in the subscription page header for this plan.
              {accessTokens.length > 0 && (
                <>
                  {" "}Tokens:{" "}
                  {accessTokens.map((t, i) => (
                    <span key={t}>
                      {i > 0 && ", "}
                      <code className="rounded bg-bone px-1 py-0.5 text-gray-800">
                        {t}
                      </code>
                    </span>
                  ))}
                </>
              )}
            </p>
            <input
              type="text"
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              placeholder="All languages unlocked"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <label className="mt-3 block text-sm font-medium text-gray-700">
              Access sub-text
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              Optional smaller second line under the access value. Leave blank to
              hide it.
            </p>
            <input
              type="text"
              value={accessSubtext}
              onChange={(e) => setAccessSubtext(e.target.value)}
              placeholder="e.g. Italian, French, German & Spanish"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Benefits (up to 5; leave blank to hide a slot)
          </label>
          {benefits.map((benefit, i) => (
            <input
              key={i}
              type="text"
              value={benefit}
              onChange={(e) => setBenefit(i, e.target.value)}
              placeholder={`Benefit ${i + 1}`}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          ))}
        </div>
      </div>
    </AdminModal>
  );
}
