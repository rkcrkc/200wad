/** Email-change confirmation template. */

import { AuthEmail } from "@/lib/email/templates/auth/AuthEmail";

export interface EmailChangeEmailProps {
  actionUrl: string;
  name?: string | null;
  /** The new email address being confirmed, if known. */
  newEmail?: string | null;
}

export function EmailChangeEmail({
  actionUrl,
  name,
  newEmail,
}: EmailChangeEmailProps) {
  return (
    <AuthEmail
      heading="Confirm your new email"
      name={name}
      intro={
        newEmail
          ? `Confirm that you want to use ${newEmail} as your new email address.`
          : "Confirm your new email address to finish updating your account."
      }
      actionUrl={actionUrl}
      actionLabel="Confirm email change"
      footnote="If you didn't request this change, contact us right away — your account may need attention."
    />
  );
}

export default EmailChangeEmail;
