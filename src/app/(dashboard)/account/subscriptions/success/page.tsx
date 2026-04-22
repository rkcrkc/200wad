import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { getCheckoutSessionOrigin } from "@/lib/queries/checkout";

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function SubscriptionSuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id } = await searchParams;

  // Try to get origin lesson context from the Stripe session
  const origin = session_id
    ? await getCheckoutSessionOrigin(session_id)
    : null;

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
        <div className="flex flex-col items-center gap-3">
          {origin?.lessonId && (
            <Button asChild>
              <Link href={`/lesson/${origin.lessonId}`}>
                Continue to {origin.lessonTitle || "Lesson"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button asChild variant={origin?.lessonId ? "outline" : "default"}>
            <Link href="/account/subscriptions">View My Subscriptions</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
