/**
 * Shared branded shell for every email we send. Renders a warm-background
 * wrapper, a white card body slot, a wordmark header, and a footer carrying the
 * legal entity + address. Notification emails pass `preferencesUrl` to surface a
 * manage-preferences link; transactional/auth emails omit it.
 */

import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { emailColors, emailTailwindConfig } from "@/lib/email/theme";
import { BRAND_NAME, LEGAL_ENTITY, LEGAL_ADDRESS } from "@/lib/legal/company";

export interface BaseLayoutProps {
  /** Inbox preview text (hidden preheader). */
  preview: string;
  children: ReactNode;
  /** When set, renders a "manage email preferences" link in the footer. */
  preferencesUrl?: string;
}

export function BaseLayout({
  preview,
  children,
  preferencesUrl,
}: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body
          className="bg-brand-bg font-sans"
          style={{ backgroundColor: emailColors.background }}
        >
          <Container
            className="mx-auto my-0 w-full max-w-[600px] px-6 py-8"
            style={{ maxWidth: "600px" }}
          >
            {/* Wordmark header */}
            <Section className="pb-4">
              <Text
                className="m-0 text-[20px] font-bold"
                style={{ color: emailColors.primary }}
              >
                {BRAND_NAME}
              </Text>
            </Section>

            {/* Card body */}
            <Section
              className="rounded-[12px] border border-solid border-brand-border bg-brand-surface px-8 py-8"
              style={{
                backgroundColor: emailColors.surface,
                borderColor: emailColors.border,
              }}
            >
              {children}
            </Section>

            {/* Footer */}
            <Section className="px-2 pt-6">
              <Hr
                className="my-4 border-brand-border"
                style={{ borderColor: emailColors.border }}
              />
              <Text
                className="m-0 text-[12px] leading-[18px]"
                style={{ color: emailColors.muted }}
              >
                {LEGAL_ENTITY}
                <br />
                {LEGAL_ADDRESS}
              </Text>
              {preferencesUrl && (
                <Text
                  className="mt-3 mb-0 text-[12px] leading-[18px]"
                  style={{ color: emailColors.muted }}
                >
                  <Link
                    href={preferencesUrl}
                    style={{ color: emailColors.primary }}
                  >
                    Manage email preferences
                  </Link>
                </Text>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
