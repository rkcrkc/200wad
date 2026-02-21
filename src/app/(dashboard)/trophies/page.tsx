import { ComingSoon } from "@/components/ComingSoon";
import { PageContainer } from "@/components/PageContainer";
import { Trophy } from "lucide-react";

export default function TrophiesPage() {
  return (
    <PageContainer size="md">
      <ComingSoon
        title="Trophies Coming Soon"
        description="Earn achievements and badges as you learn. Your trophy case is being prepared!"
        icon={<Trophy className="h-10 w-10 text-warning" />}
      />
    </PageContainer>
  );
}
