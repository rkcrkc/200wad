/**
 * Email rendering of a single notification. Consumes the same payload shape the
 * in-app `NotificationRow` reads from `notifications.data`: an optional
 * `{ cta: { label, href } }` and `severity`. When `severity === "critical"` the
 * heading + CTA adopt the destructive palette.
 */

import { Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "@/lib/email/templates/BaseLayout";
import { EmailButton } from "@/lib/email/templates/EmailButton";
import { emailColors } from "@/lib/email/theme";

export interface NotificationEmailProps {
  title: string;
  message: string;
  cta?: { label: string; href: string };
  severity?: "info" | "warning" | "critical" | string;
  /** Manage-preferences link shown in the footer. */
  preferencesUrl?: string;
}

export function NotificationEmail({
  title,
  message,
  cta,
  severity,
  preferencesUrl,
}: NotificationEmailProps) {
  const isCritical = severity === "critical";
  return (
    <BaseLayout preview={title} preferencesUrl={preferencesUrl}>
      <Heading
        as="h1"
        className="m-0 text-[24px] font-semibold"
        style={{
          color: isCritical ? emailColors.destructive : emailColors.foreground,
        }}
      >
        {title}
      </Heading>
      <Text
        className="mt-4 mb-0 text-[15px] leading-[24px]"
        style={{ color: emailColors.foreground }}
      >
        {message}
      </Text>
      {cta?.href && cta?.label && (
        <Section className="pt-6">
          <EmailButton
            href={cta.href}
            label={cta.label}
            variant={isCritical ? "critical" : "primary"}
          />
        </Section>
      )}
    </BaseLayout>
  );
}

export default NotificationEmail;
