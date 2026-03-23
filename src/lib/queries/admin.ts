import { createClient } from "@/lib/supabase/server";
import type { PricingPlan, Subscription } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

export interface PlatformConfigMap {
  default_free_lessons: number;
  enabled_tiers: string[];
  referral_credit_cents: number;
}

export interface AdminSettingsData {
  pricingPlans: PricingPlan[];
  config: PlatformConfigMap;
  subscriptionStats: {
    totalActive: number;
    totalCancelled: number;
    totalExpired: number;
    totalRevenueCents: number;
  };
}

export interface GetAdminSettingsResult {
  data: AdminSettingsData | null;
  error: string | null;
}

// ============================================================================
// Admin Settings Data
// ============================================================================

/**
 * Fetch all data for the admin settings page.
 */
export async function getAdminSettingsData(): Promise<GetAdminSettingsResult> {
  const supabase = await createClient();

  const [plansResult, configResult, subsResult] = await Promise.all([
    supabase
      .from("pricing_plans")
      .select("*")
      .order("tier")
      .order("billing_model")
      .order("amount_cents"),
    supabase.from("platform_config").select("key, value"),
    supabase
      .from("subscriptions")
      .select("status, amount_cents"),
  ]);

  if (plansResult.error) {
    return { data: null, error: plansResult.error.message };
  }

  // Parse platform config into a typed map
  const configMap: PlatformConfigMap = {
    default_free_lessons: 10,
    enabled_tiers: ["language", "all-languages"],
    referral_credit_cents: 400,
  };

  if (configResult.data) {
    for (const row of configResult.data) {
      if (row.key === "default_free_lessons" && typeof row.value === "number") {
        configMap.default_free_lessons = row.value;
      } else if (row.key === "enabled_tiers" && Array.isArray(row.value)) {
        configMap.enabled_tiers = row.value as string[];
      } else if (row.key === "referral_credit_cents" && typeof row.value === "number") {
        configMap.referral_credit_cents = row.value;
      }
    }
  }

  // Compute subscription stats
  const subs = subsResult.data || [];
  const stats = {
    totalActive: subs.filter((s) => s.status === "active").length,
    totalCancelled: subs.filter((s) => s.status === "cancelled").length,
    totalExpired: subs.filter((s) => s.status === "expired").length,
    totalRevenueCents: subs
      .filter((s) => s.status === "active" || s.status === "cancelled")
      .reduce((sum, s) => sum + s.amount_cents, 0),
  };

  return {
    data: {
      pricingPlans: plansResult.data || [],
      config: configMap,
      subscriptionStats: stats,
    },
    error: null,
  };
}
