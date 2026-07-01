import Link from "next/link";
import { Globe } from "lucide-react";
import { getSubscriptionPageData } from "@/lib/queries/subscriptions";
import { SubscriptionsPageClient, ManageBillingButton } from "@/components/subscriptions";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";

export default async function SubscriptionsPage() {
  const { data, error } = await getSubscriptionPageData();

  // Error state
  if (error || !data) {
    return (
      <PageContainer size="sm">
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <h1 className="mb-4 text-xl-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            {error || "Unable to load subscription data. Please try again."}
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="md">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">My Subscription</h1>
        <div className="flex shrink-0 items-center gap-2">
          <ManageBillingButton />
          <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1.5">
            <Link href="/dashboard?pick=true">
              <Globe className="h-4 w-4" />
              All courses
            </Link>
          </Button>
        </div>
      </div>
      <SubscriptionsPageClient data={data} />
    </PageContainer>
  );
}
