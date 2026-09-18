/**
 * Shared body for auth emails (confirm signup, reset, email change, magic link,
 * reauthentication). Each concrete template supplies a heading, intro copy, the
 * action button label, and an optional fallback/footnote — this component draws
 * the branded shell + CTA so the five templates stay DRY.
 */

import { Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "@/lib/email/templates/BaseLayout";
import { EmailButton } from "@/lib/email/templates/EmailButton";
import { emailColors } from "@/lib/email/theme";

export interface AuthEmailProps {
  /** Inbox preview + main heading. */
  heading: string;
  /** Greeting name; falls back to a generic salutation when absent. */
  name?: string | null;
  /** Body copy above the button. */
  intro: string;
  /** The verification/action URL. */
  actionUrl: string;
  /** Button label. */
  actionLabel: string;
  /** Small print below the button (e.g. "if you didn't request this…"). */
  footnote?: string;
}

export function AuthEmail({
  heading,
  name,
  intro,
  actionUrl,
  actionLabel,
  footnote,
}: AuthEmailProps) {
  return (
    <BaseLayout preview={heading}>
      <Heading
        as="h1"
        className="m-0 text-[24px] font-semibold"
        style={{ color: emailColors.foreground }}
      >
        {heading}
      </Heading>
      <Text
        className="mt-4 mb-0 text-[15px] leading-[24px]"
        style={{ color: emailColors.foreground }}
      >
        {name ? `Hi ${name},` : "Hi,"}
      </Text>
      <Text
        className="mt-2 mb-0 text-[15px] leading-[24px]"
        style={{ color: emailColors.foreground }}
      >
        {intro}
      </Text>
      <Section className="pt-6">
        <EmailButton href={actionUrl} label={actionLabel} />
      </Section>
      <Text
        className="mt-6 mb-0 text-[13px] leading-[20px]"
        style={{ color: emailColors.muted }}
      >
        If the button doesn&apos;t work, copy and paste this link into your
        browser:
        <br />
        {actionUrl}
      </Text>
      {footnote && (
        <Text
          className="mt-4 mb-0 text-[13px] leading-[20px]"
          style={{ color: emailColors.muted }}
        >
          {footnote}
        </Text>
      )}
    </BaseLayout>
  );
}
