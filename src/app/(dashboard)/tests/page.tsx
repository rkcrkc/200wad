import { ComingSoon } from "@/components/ComingSoon";
import { PageContainer } from "@/components/PageContainer";
import { ClipboardCheck } from "lucide-react";

export default function TestsPage() {
  return (
    <PageContainer size="lg">
      <ComingSoon
        title="Tests Coming Soon"
        description="Test your knowledge with quizzes and track your progress. Coming very soon!"
        icon={<ClipboardCheck className="h-10 w-10 text-warning" />}
      />
    </PageContainer>
  );
}
