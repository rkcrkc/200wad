import Link from "next/link";
import {
  getReferralStats,
  getCreditBalance,
  getReferralHistory,
} from "@/lib/queries/credits";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { ReferralsPageClient } from "@/components/referrals/ReferralsPageClient";
import { createClient } from "@/lib/supabase/server";

export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guest prompt
  if (!user) {
    return (
      <PageContainer size="sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="mb-4 text-3xl font-semibold">Refer & Earn</h1>
          <p className="mb-6 text-gray-600">
            Sign up to get your referral link and start earning credits.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const [statsResult, creditResult, referralHistory] = await Promise.all([
    getReferralStats(),
    getCreditBalance(),
    getReferralHistory(),
  ]);

  return (
    <PageContainer size="sm">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Refer & Earn</h1>
        <p className="mt-1 text-muted-foreground">
          Share 200 Words a Day with friends and earn credits for every successful referral
        </p>
      </div>
      <ReferralsPageClient
        referralCode={statsResult.referralCode}
        totalReferrals={statsResult.totalReferrals}
        completedReferrals={statsResult.completedReferrals}
        pendingReferrals={statsResult.pendingReferrals}
        totalCreditsCents={statsResult.totalCreditsCents}
        availableCreditsCents={creditResult.balance.availableCents}
        referralHistory={referralHistory}
      />
    </PageContainer>
  );
}
