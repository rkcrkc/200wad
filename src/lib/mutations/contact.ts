"use server";

import { Resend } from "resend";
import { contactMessageSchema, type ContactMessageInput } from "@/lib/validations/contact";
import { CONTACT_EMAIL, BRAND_NAME } from "@/lib/legal/company";

export interface ContactResult {
  success: boolean;
  error: string | null;
}

/**
 * Send a contact-form submission as a transactional email via Resend.
 *
 * Required env (set in .env.local + production):
 *   - RESEND_API_KEY    — Resend API key.
 *   - CONTACT_FROM_EMAIL — verified sender, e.g. "200 Words a Day <hello@200wordsaday.com>".
 *     Falls back to CONTACT_EMAIL, but the domain must be verified in Resend.
 *
 * The reply-to is set to the visitor's address so replies go straight back to them.
 * Never throws: all failures are returned in `error` for the client to show.
 */
export async function submitContactMessage(
  input: ContactMessageInput
): Promise<ContactResult> {
  try {
    // Honeypot — a filled hidden field means a bot. Pretend it worked and drop it.
    if (input.company && input.company.trim() !== "") {
      return { success: true, error: null };
    }

    const parsed = contactMessageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      };
    }
    const { name, email, category, message } = parsed.data;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Contact form: RESEND_API_KEY is not set.");
      return {
        success: false,
        error: "Sorry, the contact form isn't available right now. Please email us directly.",
      };
    }

    const from = process.env.CONTACT_FROM_EMAIL || `${BRAND_NAME} <${CONTACT_EMAIL}>`;
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from,
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `[Contact · ${category}] ${name}`,
      text: `New contact form submission\n\nName: ${name}\nEmail: ${email}\nTopic: ${category}\n\n${message}\n`,
    });

    if (error) {
      console.error("Contact form: Resend send failed:", error);
      return {
        success: false,
        error: "Something went wrong sending your message. Please try again.",
      };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Contact form: unexpected error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
