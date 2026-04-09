import Link from "next/link";
import { XCircle } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";

export default function SubscriptionCancelPage() {
  return (
    <PageContainer size="sm">
      <div className="rounded-2xl bg-white p-8 text-center shadow-card">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h1 className="mb-2 text-xl-semibold">Checkout Cancelled</h1>
        <p className="mb-6 text-muted-foreground">
          Your checkout was cancelled. No charges were made.
        </p>
        <Button asChild>
          <Link href="/account/subscriptions">Return to Subscriptions</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
