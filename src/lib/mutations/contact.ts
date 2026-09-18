"use server";

import { contactMessageSchema, type ContactMessageInput } from "@/lib/validations/contact";
import { CONTACT_EMAIL } from "@/lib/legal/company";
import { sendEmail } from "@/lib/email/send";
import { ContactEmail } from "@/lib/email/templates/ContactEmail";

export interface ContactResult {
  success: boolean;
  error: string | null;
}

/**
 * Send a contact-form submission as a branded transactional email.
 *
 * Uses the shared `sendEmail()` path (one `from` config, one transport) with the
 * `ContactEmail` template. The reply-to is set to the visitor's address so
 * replies go straight back to them. Never throws: all failures are returned in
 * `error` for the client to show.
 *
 * Required env: RESEND_API_KEY. Sender is EMAIL_FROM / CONTACT_FROM_EMAIL (see
 * `src/lib/email/client.ts`); the domain must be verified in Resend.
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

    const result = await sendEmail({
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `[Contact · ${category}] ${name}`,
      react: ContactEmail({ name, email, category, message }),
    });

    if (!result.success) {
      console.error("Contact form: send failed:", result.error);
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
