/**
 * Branded rendering of a contact-form submission, delivered to the support
 * inbox. Reply-to is set to the visitor's address by the caller so replies go
 * straight back to them.
 */

import { Heading, Hr, Section, Text } from "@react-email/components";
import { BaseLayout } from "@/lib/email/templates/BaseLayout";
import { emailColors } from "@/lib/email/theme";

export interface ContactEmailProps {
  name: string;
  email: string;
  category: string;
  message: string;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Section className="pb-2">
      <Text
        className="m-0 text-[12px] font-semibold uppercase"
        style={{ color: emailColors.muted, letterSpacing: "0.04em" }}
      >
        {label}
      </Text>
      <Text
        className="m-0 text-[15px] leading-[22px]"
        style={{ color: emailColors.foreground }}
      >
        {value}
      </Text>
    </Section>
  );
}

export function ContactEmail({
  name,
  email,
  category,
  message,
}: ContactEmailProps) {
  return (
    <BaseLayout preview={`New contact message from ${name}`}>
      <Heading
        as="h1"
        className="m-0 text-[24px] font-semibold"
        style={{ color: emailColors.foreground }}
      >
        New contact message
      </Heading>
      <Section className="pt-4">
        <Field label="Name" value={name} />
        <Field label="Email" value={email} />
        <Field label="Topic" value={category} />
      </Section>
      <Hr
        className="my-4 border-brand-border"
        style={{ borderColor: emailColors.border }}
      />
      <Text
        className="m-0 whitespace-pre-wrap text-[15px] leading-[24px]"
        style={{ color: emailColors.foreground }}
      >
        {message}
      </Text>
    </BaseLayout>
  );
}

export default ContactEmail;
