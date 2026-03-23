import { getSubscriptionPageData } from "@/lib/queries/subscriptions";
import { SubscriptionsPageClient } from "@/components/subscriptions";
import { PageContainer } from "@/components/PageContainer";

export default async function SubscriptionsPage() {
  const { data, error } = await getSubscriptionPageData();

  // Error state
  if (error || !data) {
    return (
      <PageContainer size="sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="mb-4 text-xl-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            {error || "Unable to load subscription data. Please try again."}
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="sm">
      <h1 className="mb-8 text-3xl font-semibold">Subscriptions</h1>
      <SubscriptionsPageClient data={data} />
    </PageContainer>
  );
}
