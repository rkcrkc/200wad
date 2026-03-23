import { PageContainer } from "@/components/PageContainer";
import { BackButton } from "@/components/ui/back-button";
import { CreditsHistoryClient } from "@/components/credits/CreditsHistoryClient";

export default function CreditsHistoryPage() {
  return (
    <PageContainer size="sm">
      <BackButton href="/referrals" label="Referrals" />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Credits History</h1>
        <p className="mt-1 text-muted-foreground">
          Track your earned and used credits
        </p>
      </div>
      <CreditsHistoryClient />
    </PageContainer>
  );
}
