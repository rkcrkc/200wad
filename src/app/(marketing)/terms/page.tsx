import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/LegalPage";
import {
  BRAND_NAME,
  GOVERNING_LAW,
  LEGAL_ADDRESS,
  LEGAL_ENTITY,
  LEGAL_LAST_UPDATED,
  SUPPORT_EMAIL,
} from "@/lib/legal/company";

export const metadata: Metadata = {
  title: "Terms of Service — 200 Words a Day",
  description:
    "The terms that govern your use of 200 Words a Day, including eligibility, subscriptions, acceptable use and your legal rights.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro={
        <>
          These terms are an agreement between you and {LEGAL_ENTITY} for your use of {BRAND_NAME}.
          By creating an account or using the service, you agree to them. If you do not agree,
          please do not use {BRAND_NAME}.
        </>
      }
    >
      <h2>1. Who we are</h2>
      <p>
        {BRAND_NAME} is operated by {LEGAL_ENTITY}, a company based in Hong Kong, registered address{" "}
        {LEGAL_ADDRESS} (“we”, “us”, “our”).
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least <strong>16 years old</strong> to create an account and use {BRAND_NAME}.
        By using the service you confirm that you meet this requirement and that the information you
        give us is accurate.
      </p>

      <h2>3. Your account</h2>
      <p>
        You are responsible for keeping your login credentials secure and for activity that happens
        under your account. Tell us promptly at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
        if you think your account has been compromised. You must not share your account or let others
        use it.
      </p>

      <h2>4. The service</h2>
      <p>
        {BRAND_NAME} helps you learn vocabulary through study and testing. We offer a free tier and
        paid subscriptions with additional features. We may add, change or remove features over time,
        and we may set reasonable limits (for example on usage) to keep the service running well for
        everyone.
      </p>

      <h2>5. Subscriptions, billing and renewals</h2>
      <ul>
        <li>
          Paid plans are billed in advance through our payment processor, <strong>Stripe</strong>, on
          a recurring basis (for example monthly or yearly) until you cancel.
        </li>
        <li>
          <strong>Auto-renewal:</strong> your subscription renews automatically at the end of each
          billing period at the then-current price, unless you cancel before the renewal date.
        </li>
        <li>
          You can cancel at any time from <Link href="/settings">your account settings</Link> or the
          Stripe billing portal. Cancelling stops the next renewal; you keep access until the end of
          the period you have already paid for.
        </li>
        <li>
          We may change prices or plan features. If a change affects your renewal price, we will give
          you reasonable notice, and the new price applies from your next billing period.
        </li>
      </ul>

      <h2>6. Refunds</h2>
      <p>
        Refunds and your right to cancel a purchase are described in our{" "}
        <Link href="/refunds">Refund Policy</Link>, which forms part of these terms. Your mandatory
        statutory rights are not affected.
      </p>

      <h2>7. Virtual items</h2>
      <p>
        The service may include virtual items such as coins or XP. These have no monetary value,
        cannot be exchanged for cash, and may expire or change. They are licensed to you for use
        within {BRAND_NAME}, not sold.
      </p>

      <h2>8. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>break the law or infringe anyone’s rights while using the service;</li>
        <li>
          attempt to disrupt, reverse-engineer, scrape at scale, or gain unauthorised access to the
          service or its systems;
        </li>
        <li>upload content that is unlawful, harmful, or infringing; or</li>
        <li>misuse the service in a way that harms other users or us.</li>
      </ul>

      <h2>9. Intellectual property</h2>
      <p>
        The service, including its content, courses, software, and branding, is owned by us or our
        licensors and is protected by intellectual-property laws. We grant you a personal,
        non-exclusive, non-transferable licence to use the service for your own learning. You may not
        copy, resell or redistribute our content without permission.
      </p>

      <h2>10. Your content</h2>
      <p>
        You keep ownership of the notes and other content you add. You grant us a limited licence to
        store and display that content so we can provide the service to you. You are responsible for
        what you submit and confirm you have the right to submit it.
      </p>

      <h2>11. Disclaimers</h2>
      <p>
        We work hard to provide a reliable, effective learning tool, but the service is provided “as
        is” and “as available”. We do not guarantee particular learning outcomes, or that the service
        will always be uninterrupted or error-free. To the extent permitted by law, we exclude
        implied warranties.
      </p>

      <h2>12. Liability</h2>
      <p>
        Nothing in these terms limits liability that cannot be limited by law (such as for death or
        personal injury caused by negligence, or fraud). Subject to that, we are not liable for
        indirect or consequential loss, and our total liability to you for any claim is limited to
        the amount you paid us in the 12 months before the claim. Some jurisdictions do not allow
        certain limitations, so parts of this section may not apply to you.
      </p>

      <h2>13. Suspension and termination</h2>
      <p>
        You can stop using {BRAND_NAME} and delete your account at any time from{" "}
        <Link href="/settings">your settings</Link>. We may suspend or end your access if you
        seriously or repeatedly breach these terms, or where we must for legal or security reasons.
        Where practical and lawful, we will give you notice.
      </p>

      <h2>14. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. When we make material changes we will update the
        “last updated” date and, where appropriate, notify you. Continuing to use the service after a
        change means you accept the updated terms.
      </p>

      <h2>15. Governing law</h2>
      <p>
        These terms are governed by the laws of {GOVERNING_LAW}, and disputes are subject to the
        courts of {GOVERNING_LAW}. If you are a consumer in the UK or EEA, you also benefit from any
        mandatory protections of the country where you live, and this clause does not deprive you of
        them.
      </p>

      <h2>16. Contact us</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or
        write to {LEGAL_ENTITY}, {LEGAL_ADDRESS}.
      </p>
    </LegalPage>
  );
}
