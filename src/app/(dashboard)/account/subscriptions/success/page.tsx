import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";

export default function SubscriptionSuccessPage() {
  return (
    <PageContainer size="sm">
      <div className="rounded-2xl bg-white p-8 text-center shadow-card">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h1 className="mb-2 text-xl-semibold">Subscription Confirmed</h1>
        <p className="mb-6 text-muted-foreground">
          Your subscription is now active. You have full access to all your
          subscribed content.
        </p>
        <Button asChild>
          <Link href="/account/subscriptions">View My Subscriptions</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
