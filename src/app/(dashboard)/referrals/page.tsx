import { ComingSoon } from "@/components/ComingSoon";
import { PageContainer } from "@/components/PageContainer";
import { Gift } from "lucide-react";

export default function ReferralsPage() {
  return (
    <PageContainer size="md">
      <ComingSoon
        title="Referrals Coming Soon"
        description="Invite friends and earn rewards. Share the gift of language learning!"
        icon={<Gift className="h-10 w-10 text-warning" />}
      />
    </PageContainer>
  );
}
