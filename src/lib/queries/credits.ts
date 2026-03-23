import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface CreditBalance {
  totalEarnedCents: number;
  totalSpentCents: number;
  availableCents: number;
  pendingCents: number;
}

export interface GetCreditBalanceResult {
  balance: CreditBalance;
  error: string | null;
}

export interface GetReferralStatsResult {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalCreditsCents: number;
  referralCode: string | null;
  error: string | null;
}

// ============================================================================
// Credit Balance
// ============================================================================

/**
 * Get the current credit balance for the authenticated user.
 */
export async function getCreditBalance(): Promise<GetCreditBalanceResult> {
  const emptyBalance: CreditBalance = {
    totalEarnedCents: 0,
    totalSpentCents: 0,
    availableCents: 0,
    pendingCents: 0,
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { balance: emptyBalance, error: "Not authenticated" };
  }

  const { data: transactions, error } = await supabase
    .from("credit_transactions")
    .select("amount_cents, status")
    .eq("user_id", user.id);

  if (error) {
    return { balance: emptyBalance, error: error.message };
  }

  let totalEarnedCents = 0;
  let totalSpentCents = 0;
  let pendingCents = 0;

  for (const tx of transactions || []) {
    if (tx.status === "confirmed") {
      if (tx.amount_cents > 0) {
        totalEarnedCents += tx.amount_cents;
      } else {
        totalSpentCents += Math.abs(tx.amount_cents);
      }
    } else if (tx.status === "pending" && tx.amount_cents > 0) {
      pendingCents += tx.amount_cents;
    }
  }

  return {
    balance: {
      totalEarnedCents,
      totalSpentCents,
      availableCents: totalEarnedCents - totalSpentCents,
      pendingCents,
    },
    error: null,
  };
}

// ============================================================================
// Referral History
// ============================================================================

export interface ReferralHistoryItem {
  id: string;
  displayName: string;
  date: string;
  status: string;
  creditAmountCents: number;
}

/**
 * Get recent referral history for the authenticated user.
 */
export async function getReferralHistory(): Promise<ReferralHistoryItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, status, credit_amount_cents, created_at, referred_user_id")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  if (!referrals || referrals.length === 0) return [];

  // Fetch referred user info
  const userIds = referrals.map((r) => r.referred_user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, username, email")
    .in("id", userIds);

  const userMap = new Map(
    (users || []).map((u) => [u.id, u.username || u.email || "Unknown"])
  );

  return referrals.map((r) => ({
    id: r.id,
    displayName: userMap.get(r.referred_user_id) || "Unknown",
    date: r.created_at || "",
    status: r.status,
    creditAmountCents: r.credit_amount_cents,
  }));
}

// ============================================================================
// Referral Stats
// ============================================================================

/**
 * Get referral statistics for the authenticated user.
 */
export async function getReferralStats(): Promise<GetReferralStatsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      totalCreditsCents: 0,
      referralCode: null,
      error: "Not authenticated",
    };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  const { data: referrals } = await supabase
    .from("referrals")
    .select("status, credit_amount_cents")
    .eq("referrer_id", user.id);

  let completedReferrals = 0;
  let pendingReferrals = 0;
  let totalCreditsCents = 0;

  for (const ref of referrals || []) {
    if (ref.status === "completed") {
      completedReferrals++;
      totalCreditsCents += ref.credit_amount_cents;
    } else if (ref.status === "pending") {
      pendingReferrals++;
    }
  }

  return {
    totalReferrals: (referrals || []).length,
    completedReferrals,
    pendingReferrals,
    totalCreditsCents,
    referralCode: userData?.referral_code || null,
    error: null,
  };
}
