/** Password-reset (recovery) template. */

import { AuthEmail } from "@/lib/email/templates/auth/AuthEmail";

export interface ResetPasswordEmailProps {
  actionUrl: string;
  name?: string | null;
}

export function ResetPasswordEmail({
  actionUrl,
  name,
}: ResetPasswordEmailProps) {
  return (
    <AuthEmail
      heading="Reset your password"
      name={name}
      intro="We received a request to reset your password. Click the button below to choose a new one."
      actionUrl={actionUrl}
      actionLabel="Reset password"
      footnote="If you didn't request a password reset, you can safely ignore this email — your password won't change."
    />
  );
}

export default ResetPasswordEmail;
