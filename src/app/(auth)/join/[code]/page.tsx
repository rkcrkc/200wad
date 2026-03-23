import { redirect } from "next/navigation";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

/**
 * Referral join page.
 * Redirects to signup with the referral code as a query parameter.
 */
export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  redirect(`/signup?ref=${encodeURIComponent(code)}`);
}
