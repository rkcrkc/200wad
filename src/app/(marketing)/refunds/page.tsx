import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/LegalPage";
import {
  BRAND_NAME,
  LEGAL_ENTITY,
  LEGAL_LAST_UPDATED,
  SUPPORT_EMAIL,
} from "@/lib/legal/company";

export const metadata: Metadata = {
  title: "Refund Policy — 200 Words a Day",
  description:
    "How refunds and cancellations work for 200 Words a Day subscriptions, and how your statutory rights apply.",
  alternates: { canonical: "/refunds" },
};

export default function RefundPolicy() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro={
        <>
          This policy explains how refunds and cancellations work for {BRAND_NAME} subscriptions. It
          forms part of our <Link href="/terms">Terms of Service</Link> and does not affect any
          mandatory rights you have under your local law.
        </>
      }
    >
      <h2>1. Immediate access and the 14-day cooling-off period</h2>
      <p>
        {BRAND_NAME} is digital content that you get access to straight away. If you are a consumer
        in the UK or EEA, you normally have a 14-day right to cancel an online purchase. Because you
        get immediate access to the full service, <strong>you ask us to start providing it right
        away and acknowledge that you therefore lose that 14-day right of withdrawal</strong> once
        the service has begun. You confirm this at the point of purchase.
      </p>

      <h2>2. Cancelling your subscription</h2>
      <p>
        You can cancel at any time from <Link href="/settings">your account settings</Link> or the
        Stripe billing portal. Cancelling stops your subscription from renewing — you will not be
        charged again — and you keep access until the end of the period you have already paid for. We
        do not provide pro-rated refunds for the unused part of a billing period unless the law
        requires it.
      </p>

      <h2>3. Renewals</h2>
      <p>
        Subscriptions renew automatically. To avoid being charged for the next period, cancel before
        your renewal date. If you were charged because you did not cancel in time, contact us — we
        will look at each case fairly, though we are not obliged to refund a renewal you were told
        about in advance.
      </p>

      <h2>4. Virtual items</h2>
      <p>
        Virtual items such as coins or XP have no cash value and are non-refundable, except where the
        law says otherwise.
      </p>

      <h2>5. When we will give a refund</h2>
      <ul>
        <li>where your local consumer law gives you a non-waivable right to one;</li>
        <li>if you were charged in error, or charged twice for the same period; or</li>
        <li>
          if a serious fault meant you could not use a paid feature and we could not fix it within a
          reasonable time.
        </li>
      </ul>

      <h2>6. Your statutory rights</h2>
      <p>
        Nothing in this policy removes or limits rights you have under mandatory consumer-protection
        law in your country. If those laws give you a stronger right to a refund than this policy,
        those laws apply.
      </p>

      <h2>7. How to request a refund or get help</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the email address on your
        account and details of the charge. Refunds we approve are returned to your original payment
        method via Stripe. This policy is operated by {LEGAL_ENTITY}.
      </p>
    </LegalPage>
  );
}
