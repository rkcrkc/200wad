/** Signup email-confirmation template. */

import { AuthEmail } from "@/lib/email/templates/auth/AuthEmail";
import { BRAND_NAME } from "@/lib/legal/company";

export interface ConfirmSignupEmailProps {
  actionUrl: string;
  name?: string | null;
}

export function ConfirmSignupEmail({
  actionUrl,
  name,
}: ConfirmSignupEmailProps) {
  return (
    <AuthEmail
      heading="Confirm your email"
      name={name}
      intro={`Welcome to ${BRAND_NAME}! Confirm your email address to activate your account and start learning.`}
      actionUrl={actionUrl}
      actionLabel="Confirm email"
      footnote="If you didn't create this account, you can safely ignore this email."
    />
  );
}

export default ConfirmSignupEmail;
