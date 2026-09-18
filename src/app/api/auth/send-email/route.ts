/**
 * Supabase "Send Email" auth hook.
 *
 * When the Send-Email hook is enabled, Supabase POSTs every piece of auth mail
 * (signup confirmation, recovery, email change, magic link, reauthentication)
 * to this route instead of sending it via SMTP. We verify the Standard Webhooks
 * signature, render the matching branded React Email template, and send it via
 * Resend.
 *
 * Config:
 *   - SEND_EMAIL_HOOK_SECRET — "v1,whsec_<base64>" signing secret from the
 *     Supabase Auth Hooks dashboard.
 *   - RESEND_API_KEY — required for delivery.
 *
 * Returns 200 on success, non-200 on failure so Supabase logs + retries.
 */

import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { AUTH_FROM } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/host";
import { ConfirmSignupEmail } from "@/lib/email/templates/auth/ConfirmSignupEmail";
import { ResetPasswordEmail } from "@/lib/email/templates/auth/ResetPasswordEmail";
import { EmailChangeEmail } from "@/lib/email/templates/auth/EmailChangeEmail";
import { MagicLinkEmail } from "@/lib/email/templates/auth/MagicLinkEmail";
import { ReauthenticationEmail } from "@/lib/email/templates/auth/ReauthenticationEmail";
import type { ReactElement } from "react";

interface HookUser {
  email?: string;
  new_email?: string;
  user_metadata?: { name?: string; full_name?: string } | null;
}

interface HookEmailData {
  token: string;
  token_hash: string;
  token_new?: string;
  token_hash_new?: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  new_email?: string;
}

interface HookPayload {
  user: HookUser;
  email_data: HookEmailData;
}

/**
 * Build the link to our own `/auth/confirm` route, which calls `verifyOtp` then
 * redirects. Using our own route (rather than Supabase's `/auth/v1/verify`)
 * keeps the PKCE flow inside the app origin.
 */
function buildConfirmUrl(
  tokenHash: string,
  type: string,
  redirectTo: string
): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type,
    next: redirectTo,
  });
  return appUrl(`/auth/confirm?${params.toString()}`);
}

function displayName(user: HookUser): string | null {
  return (
    user.user_metadata?.name ?? user.user_metadata?.full_name ?? null
  );
}

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    console.error("[auth-hook] SEND_EMAIL_HOOK_SECRET is not set.");
    return NextResponse.json({ error: "hook not configured" }, { status: 500 });
  }

  const payloadText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let payload: HookPayload;
  try {
    const wh = new Webhook(secret.replace("v1,whsec_", ""));
    payload = wh.verify(payloadText, headers) as HookPayload;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth-hook] signature verification failed:", message);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const { user, email_data } = payload;
  const name = displayName(user);
  const actionType = email_data.email_action_type;

  // Recipient defaults to the user's email; email_change confirmation of the
  // *new* address goes to that new address.
  let to = user.email;

  let subject: string;
  let react: ReactElement;

  switch (actionType) {
    case "signup": {
      const url = buildConfirmUrl(
        email_data.token_hash,
        "signup",
        email_data.redirect_to
      );
      subject = "Confirm your email";
      react = ConfirmSignupEmail({ actionUrl: url, name });
      break;
    }
    case "recovery": {
      const url = buildConfirmUrl(
        email_data.token_hash,
        "recovery",
        email_data.redirect_to
      );
      subject = "Reset your password";
      react = ResetPasswordEmail({ actionUrl: url, name });
      break;
    }
    case "magiclink": {
      const url = buildConfirmUrl(
        email_data.token_hash,
        "magiclink",
        email_data.redirect_to
      );
      subject = "Your sign-in link";
      react = MagicLinkEmail({ actionUrl: url, name });
      break;
    }
    case "email_change": {
      // Send the confirmation for the NEW address to the new address. (With
      // Secure Email Change, Supabase also sends a separate hook call for the
      // old address using the primary token pair.)
      const newEmail = email_data.new_email ?? user.new_email ?? null;
      to = newEmail ?? user.email;
      const tokenHash = email_data.token_hash_new ?? email_data.token_hash;
      const url = buildConfirmUrl(
        tokenHash,
        "email_change",
        email_data.redirect_to
      );
      subject = "Confirm your new email";
      react = EmailChangeEmail({ actionUrl: url, name, newEmail });
      break;
    }
    case "reauthentication": {
      subject = "Your verification code";
      react = ReauthenticationEmail({ token: email_data.token, name });
      break;
    }
    default: {
      console.error(
        `[auth-hook] unsupported email_action_type: ${actionType}`
      );
      return NextResponse.json(
        { error: `unsupported action ${actionType}` },
        { status: 400 }
      );
    }
  }

  if (!to) {
    console.error("[auth-hook] no recipient email in payload.");
    return NextResponse.json({ error: "no recipient" }, { status: 400 });
  }

  const result = await sendEmail({ to, subject, react, from: AUTH_FROM });
  if (!result.success) {
    console.error("[auth-hook] send failed:", result.error);
    return NextResponse.json(
      { error: result.error ?? "send failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
