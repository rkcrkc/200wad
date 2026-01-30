import { ComingSoon } from "@/components/ComingSoon";
import { Users } from "lucide-react";

export default function CommunityPage() {
  return (
    <ComingSoon
      title="Community Coming Soon"
      description="Connect with other learners, share tips, and practice together. The community is growing!"
      icon={<Users className="h-10 w-10 text-warning" />}
    />
  );
}
