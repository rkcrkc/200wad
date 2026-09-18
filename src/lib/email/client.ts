/**
 * Resend client + `from` address constants — the single place email transport
 * is configured.
 *
 * Required env:
 *   - RESEND_API_KEY — Resend API key. Without it, `getResendClient()` returns
 *     null and callers should treat the send as a (logged) failure rather than
 *     throwing.
 *
 * Optional env (override the defaults):
 *   - EMAIL_FROM / CONTACT_FROM_EMAIL — transactional sender (contact form,
 *     notification emails).
 *   - AUTH_FROM_EMAIL — sender for Supabase auth mail (confirmations, resets).
 */

import { Resend } from "resend";
import { BRAND_NAME } from "@/lib/legal/company";

let cached: Resend | null = null;

/**
 * Returns a singleton Resend client, or null if RESEND_API_KEY is unset. Logs
 * clearly on the missing-key path so ops can diagnose a silent no-send.
 */
export function getResendClient(): Resend | null {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "[email] RESEND_API_KEY is not set — email sending is disabled."
    );
    return null;
  }
  cached = new Resend(apiKey);
  return cached;
}

/**
 * Transactional sender (contact form + notification emails). Falls back to a
 * sensible default; the domain must be verified in Resend.
 */
export const TRANSACTIONAL_FROM =
  process.env.EMAIL_FROM ||
  process.env.CONTACT_FROM_EMAIL ||
  `${BRAND_NAME} <hello@send.200words-a-day.com>`;

/** Sender for Supabase auth mail (confirmations, resets, magic links). */
export const AUTH_FROM =
  process.env.AUTH_FROM_EMAIL ||
  `${BRAND_NAME} <no-reply@send.200words-a-day.com>`;
