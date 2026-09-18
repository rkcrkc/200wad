/**
 * Reauthentication template. Supabase reauthentication delivers a numeric OTP
 * rather than a link, so this template renders the code prominently instead of a
 * button.
 */

import { Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "@/lib/email/templates/BaseLayout";
import { emailColors } from "@/lib/email/theme";

export interface ReauthenticationEmailProps {
  /** The one-time verification code. */
  token: string;
  name?: string | null;
}

export function ReauthenticationEmail({
  token,
  name,
}: ReauthenticationEmailProps) {
  return (
    <BaseLayout preview="Your verification code">
      <Heading
        as="h1"
        className="m-0 text-[24px] font-semibold"
        style={{ color: emailColors.foreground }}
      >
        Confirm it&apos;s you
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
        Enter this code to confirm your identity:
      </Text>
      <Section className="pt-6">
        <Text
          className="m-0 text-[32px] font-bold"
          style={{ color: emailColors.primary, letterSpacing: "0.2em" }}
        >
          {token}
        </Text>
      </Section>
      <Text
        className="mt-6 mb-0 text-[13px] leading-[20px]"
        style={{ color: emailColors.muted }}
      >
        If you didn&apos;t request this, you can safely ignore this email.
      </Text>
    </BaseLayout>
  );
}

export default ReauthenticationEmail;
