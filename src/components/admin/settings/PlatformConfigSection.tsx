"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updatePlatformConfig } from "@/lib/mutations/admin/config";
import type { PlatformConfigMap } from "@/lib/queries/admin";

interface PlatformConfigSectionProps {
  config: PlatformConfigMap;
}

export function PlatformConfigSection({ config }: PlatformConfigSectionProps) {
  const [freeLessons, setFreeLessons] = useState(
    config.default_free_lessons.toString()
  );
  const [referralCredit, setReferralCredit] = useState(
    (config.referral_credit_cents / 100).toFixed(2)
  );
  const [enabledTiers, setEnabledTiers] = useState(config.enabled_tiers);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleTier(tier: string) {
    setEnabledTiers((prev) =>
      prev.includes(tier)
        ? prev.filter((t) => t !== tier)
        : [...prev, tier]
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const results = await Promise.all([
      updatePlatformConfig(
        "default_free_lessons",
        parseInt(freeLessons, 10) || 10
      ),
      updatePlatformConfig("enabled_tiers", enabledTiers),
      updatePlatformConfig(
        "referral_credit_cents",
        Math.round(parseFloat(referralCredit) * 100) || 400
      ),
    ]);

    setSaving(false);

    const firstError = results.find((r) => !r.success);
    if (firstError) {
      setMessage(`Error: ${firstError.error}`);
    } else {
      setMessage("Configuration saved");
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Platform Configuration
        </h2>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${
            message.startsWith("Error")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
        {/* Free Lessons */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Default Free Lessons
            </div>
            <div className="text-xs text-gray-500">
              Number of free lessons per course (can be overridden per course)
            </div>
          </div>
          <input
            type="number"
            min="0"
            value={freeLessons}
            onChange={(e) => setFreeLessons(e.target.value)}
            className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-right"
          />
        </div>

        {/* Referral Credit */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Referral Credit Amount
            </div>
            <div className="text-xs text-gray-500">
              USD amount credited per successful referral
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={referralCredit}
              onChange={(e) => setReferralCredit(e.target.value)}
              className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-right"
            />
          </div>
        </div>

        {/* Enabled Tiers */}
        <div className="px-6 py-4">
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-900">
              Enabled Subscription Tiers
            </div>
            <div className="text-xs text-gray-500">
              Which subscription tiers are shown to users
            </div>
          </div>
          <div className="space-y-3">
            {[
              { id: "course", label: "Course", desc: "Single course access" },
              {
                id: "language",
                label: "Language",
                desc: "All courses in one language",
              },
              {
                id: "all-languages",
                label: "All Languages",
                desc: "Everything, all languages",
              },
            ].map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between"
              >
                <div>
                  <div className="text-sm text-gray-700">{tier.label}</div>
                  <div className="text-xs text-gray-400">{tier.desc}</div>
                </div>
                <Switch
                  checked={enabledTiers.includes(tier.id)}
                  onCheckedChange={() => toggleTier(tier.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
