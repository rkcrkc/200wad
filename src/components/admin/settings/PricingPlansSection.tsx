"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  togglePricingPlanActive,
} from "@/lib/mutations/admin/pricing";
import { syncPricingToStripe } from "@/lib/mutations/admin/stripe";
import type { PricingPlan } from "@/types/database";

interface PricingPlansSectionProps {
  plans: PricingPlan[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function tierLabel(tier: string): string {
  if (tier === "all-languages") return "All Languages";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function billingLabel(model: string): string {
  return model.charAt(0).toUpperCase() + model.slice(1);
}

export function PricingPlansSection({ plans }: PricingPlansSectionProps) {
  const [localPlans, setLocalPlans] = useState(plans);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function handleToggleActive(id: string, currentActive: boolean) {
    const result = await togglePricingPlanActive(id, !currentActive);
    if (result.success) {
      setLocalPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentActive } : p))
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this pricing plan?")) return;
    const result = await deletePricingPlan(id);
    if (result.success) {
      setLocalPlans((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    const result = await syncPricingToStripe();
    setSyncing(false);
    setSyncMessage(
      result.success
        ? "Synced to Stripe successfully"
        : `Sync failed: ${result.error}`
    );
    if (result.success) {
      // Reload to get updated stripe IDs
      window.location.reload();
    }
  }

  async function handleCreateSubmit(data: {
    tier: string;
    billing_model: string;
    amount_cents: number;
  }) {
    const result = await createPricingPlan({
      tier: data.tier as "course" | "language" | "all-languages",
      billing_model: data.billing_model as "monthly" | "annual" | "lifetime",
      amount_cents: data.amount_cents,
      is_active: false,
    });
    if (result.success) {
      setShowCreate(false);
      window.location.reload();
    }
  }

  async function handleEditSubmit(id: string, amountCents: number) {
    const result = await updatePricingPlan(id, {
      amount_cents: amountCents,
    });
    if (result.success) {
      setLocalPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, amount_cents: amountCents } : p))
      );
      setEditingPlan(null);
    }
  }

  // Group by tier
  const tiers = ["course", "language", "all-languages"];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pricing Plans</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync to Stripe"}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Plan
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${
            syncMessage.includes("failed")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {syncMessage}
        </div>
      )}

      {tiers.map((tier) => {
        const tierPlans = localPlans.filter((p) => p.tier === tier);
        if (tierPlans.length === 0) return null;

        return (
          <div key={tier} className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-gray-500 uppercase">
              {tierLabel(tier)}
            </h3>
            <div className="divide-y divide-bone-hover overflow-hidden rounded-xl bg-white">
              {tierPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {billingLabel(plan.billing_model)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPrice(plan.amount_cents)}
                      {plan.billing_model === "monthly"
                        ? "/mo"
                        : plan.billing_model === "annual"
                          ? "/yr"
                          : " one-time"}
                      {plan.stripe_price_id && (
                        <span className="ml-2 text-green-600">Stripe synced</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit price
                    </button>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() =>
                        handleToggleActive(plan.id, plan.is_active)
                      }
                    />
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Create Modal */}
      <CreatePlanModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateSubmit}
      />

      {/* Edit Modal */}
      {editingPlan && (
        <EditPriceModal
          isOpen={true}
          onClose={() => setEditingPlan(null)}
          plan={editingPlan}
          onSubmit={(cents) => handleEditSubmit(editingPlan.id, cents)}
        />
      )}
    </section>
  );
}

// ============================================================================
// Create Plan Modal
// ============================================================================

function CreatePlanModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    tier: string;
    billing_model: string;
    amount_cents: number;
  }) => void;
}) {
  const [tier, setTier] = useState("language");
  const [billingModel, setBillingModel] = useState("monthly");
  const [amount, setAmount] = useState("");

  function handleSubmit() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 0) return;
    onSubmit({ tier, billing_model: billingModel, amount_cents: cents });
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Pricing Plan"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tier
          </label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="course">Course</option>
            <option value="language">Language</option>
            <option value="all-languages">All Languages</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Billing Model
          </label>
          <select
            value={billingModel}
            onChange={(e) => setBillingModel(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Amount (USD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="14.99"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
    </AdminModal>
  );
}

// ============================================================================
// Edit Price Modal
// ============================================================================

function EditPriceModal({
  isOpen,
  onClose,
  plan,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  plan: PricingPlan;
  onSubmit: (cents: number) => void;
}) {
  const [amount, setAmount] = useState((plan.amount_cents / 100).toFixed(2));

  function handleSubmit() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 0) return;
    onSubmit(cents);
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${tierLabel(plan.tier)} ${billingLabel(plan.billing_model)} Price`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </>
      }
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Amount (USD)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {plan.stripe_price_id && (
          <p className="mt-2 text-xs text-orange-600">
            Note: Changing the price requires re-syncing to Stripe (creates a new Stripe Price).
          </p>
        )}
      </div>
    </AdminModal>
  );
}
