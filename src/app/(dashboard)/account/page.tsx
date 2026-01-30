import { ComingSoon } from "@/components/ComingSoon";
import { UserCircle } from "lucide-react";

export default function AccountPage() {
  return (
    <ComingSoon
      title="Account Coming Soon"
      description="Manage your profile, subscription, and account details. Your account page is on the way!"
      icon={<UserCircle className="h-10 w-10 text-warning" />}
    />
  );
}
