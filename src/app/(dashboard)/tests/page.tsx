import { ComingSoon } from "@/components/ComingSoon";
import { ClipboardCheck } from "lucide-react";

export default function TestsPage() {
  return (
    <ComingSoon
      title="Tests Coming Soon"
      description="Test your knowledge with quizzes and track your progress. Coming very soon!"
      icon={<ClipboardCheck className="h-10 w-10 text-warning" />}
    />
  );
}
