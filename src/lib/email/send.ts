/**
 * Thin send wrapper over Resend. Renders a React Email element and sends it.
 *
 * Both `sendEmail` and `sendEmailBatch` **never throw** — every failure is
 * returned in the result so callers (contact form, notification dispatcher,
 * auth hook) can degrade gracefully. Email is best-effort; the inbox row / auth
 * state is the source of truth.
 */

import type { ReactElement } from "react";
import { getResendClient, TRANSACTIONAL_FROM } from "@/lib/email/client";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  /** React Email element rendered to HTML + text by Resend. */
  react: ReactElement;
  /** Optional reply-to (e.g. the visitor's address on the contact form). */
  replyTo?: string;
  /** Overrides the default transactional sender. */
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  error: string | null;
}

/** Send a single email. Never throws. */
export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY is not set" };
  }
  try {
    const { error } = await resend.emails.send({
      from: input.from ?? TRANSACTIONAL_FROM,
      to: input.to,
      subject: input.subject,
      react: input.react,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "Unknown Resend error";
      console.error("[email] send failed:", message);
      return { success: false, error: message };
    }
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] send threw:", message);
    return { success: false, error: message };
  }
}

/** A single message in a batch send. */
export type BatchEmailMessage = SendEmailInput;

/** Per-message result from a batch send, index-aligned with the input array. */
export interface BatchSendResult {
  results: SendEmailResult[];
}

/** Resend's batch endpoint caps each call at 100 messages. */
const BATCH_CHUNK_SIZE = 100;

/**
 * Send many emails via Resend's batch endpoint in chunks of 100. Never throws;
 * returns a per-message result array index-aligned with `messages`. A failed
 * chunk marks every message in that chunk as failed (Resend batch is all-or-
 * nothing per call), so individual failures within a successful chunk are not
 * separately surfaced — the endpoint returns success for the batch as a whole.
 */
export async function sendEmailBatch(
  messages: BatchEmailMessage[]
): Promise<BatchSendResult> {
  const results: SendEmailResult[] = new Array(messages.length).fill(null).map(
    () => ({ success: false, error: "not sent" })
  );

  const resend = getResendClient();
  if (!resend) {
    return {
      results: results.map(() => ({
        success: false,
        error: "RESEND_API_KEY is not set",
      })),
    };
  }

  for (let start = 0; start < messages.length; start += BATCH_CHUNK_SIZE) {
    const chunk = messages.slice(start, start + BATCH_CHUNK_SIZE);
    try {
      const { error } = await resend.batch.send(
        chunk.map((m) => ({
          from: m.from ?? TRANSACTIONAL_FROM,
          to: m.to,
          subject: m.subject,
          react: m.react,
          ...(m.replyTo ? { replyTo: m.replyTo } : {}),
        }))
      );
      if (error) {
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message: unknown }).message)
            : "Unknown Resend batch error";
        console.error("[email] batch send failed:", message);
        for (let i = 0; i < chunk.length; i++) {
          results[start + i] = { success: false, error: message };
        }
      } else {
        for (let i = 0; i < chunk.length; i++) {
          results[start + i] = { success: true, error: null };
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[email] batch send threw:", message);
      for (let i = 0; i < chunk.length; i++) {
        results[start + i] = { success: false, error: message };
      }
    }
  }

  return { results };
}
