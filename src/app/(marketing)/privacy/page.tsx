import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/LegalPage";
import {
  BACKUP_RETENTION,
  BRAND_NAME,
  COMPANY_NUMBER,
  LEGAL_ADDRESS,
  LEGAL_ENTITY,
  LEGAL_LAST_UPDATED,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
  UK_EU_REPRESENTATIVE,
} from "@/lib/legal/company";

export const metadata: Metadata = {
  title: "Privacy Policy — 200 Words a Day",
  description:
    "How 200 Words a Day collects, uses and protects your personal data, and the rights you have under Hong Kong PDPO and UK/EU GDPR.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro={
        <>
          This policy explains what personal data {BRAND_NAME} collects, why we collect it, how we
          use and share it, and the choices and rights you have. Please read it alongside our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </>
      }
    >
      <h2>1. Who we are</h2>
      <p>
        {BRAND_NAME} (“we”, “us”, “our”) is a language-learning service operated by {LEGAL_ENTITY},
        a company based in Hong Kong (registration no. {COMPANY_NUMBER}), registered address{" "}
        {LEGAL_ADDRESS}. For the purposes of applicable data-protection law we are the “data
        controller” of your personal data.
      </p>
      <p>
        For any privacy question or to exercise your rights, contact us at{" "}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>

      <h2>2. Which laws apply</h2>
      <p>
        As a Hong Kong business we handle personal data in line with the Hong Kong{" "}
        <strong>Personal Data (Privacy) Ordinance (PDPO)</strong>. Because we offer our service to
        people in the United Kingdom and the European Economic Area, the{" "}
        <strong>UK GDPR and EU GDPR</strong> also apply to that processing, and this policy is
        written to meet those standards as well.
      </p>
      <p>
        Where required, our UK/EU representative under Article 27 GDPR is: {UK_EU_REPRESENTATIVE}.
      </p>

      <h2>3. The data we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — your email address and password (passwords are stored
          only as a secure hash, never in plain text). If you sign in with a third-party provider,
          we receive the basic profile that provider shares.
        </li>
        <li>
          <strong>Profile data</strong> — an optional display name and the languages and courses
          you choose to learn.
        </li>
        <li>
          <strong>Learning activity</strong> — your study and test sessions, per-word progress,
          streaks, coins/XP, and any personal notes you add to words.
        </li>
        <li>
          <strong>Payment data</strong> — if you subscribe, payments are handled by{" "}
          <strong>Stripe</strong>. We do not receive or store your full card number; we keep a
          customer/subscription reference and basic billing status.
        </li>
        <li>
          <strong>Usage &amp; device data</strong> — product analytics events (pages viewed,
          features used) and technical data such as approximate region, browser and device type,
          collected to run and improve the service.
        </li>
        <li>
          <strong>Communications</strong> — messages and feedback you send us, and your
          preferences for the emails and notifications we send you.
        </li>
      </ul>

      <h2>4. How we use your data, and our legal bases</h2>
      <p>Under the GDPR we rely on the following legal bases:</p>
      <ul>
        <li>
          <strong>To provide the service</strong> — create your account, save your progress and run
          study/test sessions. <em>Basis: performance of a contract.</em>
        </li>
        <li>
          <strong>To take payment</strong> — manage subscriptions, renewals and receipts.{" "}
          <em>Basis: performance of a contract.</em>
        </li>
        <li>
          <strong>To improve and secure the product</strong> — analytics, debugging, preventing
          abuse and fraud. <em>Basis: our legitimate interests.</em>
        </li>
        <li>
          <strong>To communicate with you</strong> — service messages (required for the account)
          and, where you have opted in, product or marketing emails.{" "}
          <em>Basis: legitimate interests for service messages; consent for marketing.</em>
        </li>
        <li>
          <strong>To meet legal obligations</strong> — tax, accounting and responding to lawful
          requests. <em>Basis: legal obligation.</em>
        </li>
      </ul>
      <p>Under the PDPO, we only use your data for the purposes above or a directly related one.</p>

      <h2>5. Cookies and analytics</h2>
      <p>
        We use strictly necessary cookies to keep you signed in and to remember basic preferences.
        We also use privacy-conscious product analytics to understand how the service is used. You
        can control non-essential cookies through your browser settings and, where offered, through
        our in-app controls. Non-essential/analytics cookies are used only where permitted.
      </p>

      <h2>6. Who we share data with</h2>
      <p>We do not sell your personal data. We share it only with service providers who help us run {BRAND_NAME}:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, authentication and file storage (hosting our
          application data).
        </li>
        <li>
          <strong>Stripe</strong> — payment processing and subscription management.
        </li>
        <li>
          <strong>PostHog (EU)</strong> — product analytics, hosted in the European Union.
        </li>
        <li>
          <strong>Email provider</strong> — sending account and (if you opt in) marketing emails.
        </li>
      </ul>
      <p>
        Each provider is bound by contract to protect your data and to use it only on our
        instructions. We may also disclose data where required by law or to protect our rights.
      </p>

      <h2>7. International transfers</h2>
      <p>
        We operate from Hong Kong and use providers located in various regions, so your data may be
        transferred outside the UK/EEA. Where we transfer personal data of UK/EEA users, we rely on
        appropriate safeguards such as the Standard Contractual Clauses (and the UK Addendum) or an
        adequacy decision. You can ask us for more detail using the contact above.
      </p>

      <h2>8. How long we keep it</h2>
      <p>
        We keep your account and learning data for as long as your account is active. If you delete
        your account, we delete your personal data from our systems. Records that must be kept for a
        legally required period (for example billing and tax records) are retained by our payment
        processor, <strong>Stripe</strong>, for that period under its own retention policy; we do not
        keep a separate copy. Residual copies in our encrypted backups are purged on our normal
        backup cycle (about {BACKUP_RETENTION}).
      </p>

      <h2>9. Your rights</h2>
      <p>
        Subject to the applicable law, you have the right to <strong>access</strong> a copy of your
        data, to <strong>correct</strong> inaccurate data, to <strong>delete</strong> your data, to{" "}
        <strong>restrict</strong> or <strong>object</strong> to certain processing, to{" "}
        <strong>data portability</strong>, and to <strong>withdraw consent</strong> at any time
        (without affecting processing already carried out). You can exercise most of these directly
        in <Link href="/settings">your account settings</Link>, or by emailing{" "}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>
      <p>
        If you are in the UK/EEA and believe we have mishandled your data, you may complain to your
        local supervisory authority (in the UK, the Information Commissioner’s Office at ico.org.uk).
        If you are in Hong Kong, you may contact the Office of the Privacy Commissioner for Personal
        Data (PCPD) at pcpd.org.hk. We would appreciate the chance to resolve your concern first.
      </p>

      <h2>10. Security</h2>
      <p>
        We use technical and organisational measures to protect your data, including encryption in
        transit, hashed passwords, access controls and row-level security on our database. No system
        is perfectly secure, but we work to protect your information and to notify you and the
        relevant authority if a breach legally requires it.
      </p>

      <h2>11. Children</h2>
      <p>
        {BRAND_NAME} is intended for users aged <strong>16 and over</strong>. We do not knowingly
        collect personal data from children under 16. If you believe a child has given us personal
        data, contact us and we will delete it.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we make material changes we will update
        the “last updated” date above and, where appropriate, notify you in the app or by email.
      </p>

      <h2>13. Contact us</h2>
      <p>
        Privacy questions: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. General support:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Postal address: {LEGAL_ENTITY},{" "}
        {LEGAL_ADDRESS}.
      </p>
    </LegalPage>
  );
}
