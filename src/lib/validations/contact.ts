import { z } from "zod";

/** Enquiry categories offered in the contact form's dropdown. */
export const CONTACT_CATEGORIES = [
  "General",
  "Billing & subscriptions",
  "Bug report",
  "Partnership or press",
  "Other",
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

/**
 * Contact form payload. `company` is a honeypot: it's hidden from real users, so
 * any non-empty value indicates a bot — the mutation silently drops those.
 */
export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "That name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email")
    .email("Please enter a valid email address")
    .max(200, "That email is too long"),
  category: z.enum(CONTACT_CATEGORIES, {
    message: "Please choose a topic",
  }),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least a few words (10+ characters)")
    .max(2000, "Please keep your message under 2000 characters"),
  company: z.string().optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
