/** Passwordless magic-link sign-in template. */

import { AuthEmail } from "@/lib/email/templates/auth/AuthEmail";

export interface MagicLinkEmailProps {
  actionUrl: string;
  name?: string | null;
}

export function MagicLinkEmail({ actionUrl, name }: MagicLinkEmailProps) {
  return (
    <AuthEmail
      heading="Your sign-in link"
      name={name}
      intro="Click the button below to sign in. This link will expire shortly and can only be used once."
      actionUrl={actionUrl}
      actionLabel="Sign in"
      footnote="If you didn't try to sign in, you can safely ignore this email."
    />
  );
}

export default MagicLinkEmail;
