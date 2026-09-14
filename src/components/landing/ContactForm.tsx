"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { submitContactMessage } from "@/lib/mutations/contact";
import {
  CONTACT_CATEGORIES,
  type ContactCategory,
} from "@/lib/validations/contact";

const FIELD_CLASS =
  "w-full rounded-[15px] border-0 bg-white p-4 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]";
const LABEL_CLASS = "label-heavy text-[var(--ink)]";

/**
 * Marketing contact form — name, email, topic and message, submitted to the
 * `submitContactMessage` server action (Resend email). Brand-styled inputs match
 * the newsletter capture card. States: idle → submitting → success | error, with
 * a top-level error banner and an accessible success confirmation.
 */
export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "" as "" | ContactCategory,
    message: "",
    company: "", // honeypot
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (status === "error") {
      setStatus("idle");
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) {
      setStatus("error");
      setError("Please choose a topic.");
      return;
    }
    setStatus("submitting");
    setError(null);

    const result = await submitContactMessage({
      name: form.name,
      email: form.email,
      category: form.category,
      message: form.message,
      company: form.company,
    });

    if (result.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="card flex flex-col items-start gap-3 p-6 sm:p-8"
      >
        <span className="grid size-10 place-items-center rounded-full bg-[var(--success)]">
          <Check className="h-5 w-5 text-white" strokeWidth={3} aria-hidden />
        </span>
        <h2 className="heading-s text-[var(--ink)]">Message sent</h2>
        <p className="body text-[var(--ink-soft)]">
          Thanks for getting in touch &mdash; we&rsquo;ll reply to your email as soon as we
          can.
        </p>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Honeypot — visually hidden, off the tab order; bots fill it, humans don't. */}
      <div aria-hidden className="hidden">
        <label>
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-name" className={LABEL_CLASS}>
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          placeholder="Your name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          disabled={submitting}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-email" className={LABEL_CLASS}>
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          disabled={submitting}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-category" className={LABEL_CLASS}>
          Topic
        </label>
        <select
          id="contact-category"
          required
          value={form.category}
          onChange={(e) => update("category", e.target.value as ContactCategory)}
          disabled={submitting}
          className={`${FIELD_CLASS} ${form.category ? "" : "text-[var(--ink-soft)]"}`}
        >
          <option value="" disabled>
            Choose a topic&hellip;
          </option>
          {CONTACT_CATEGORIES.map((c) => (
            <option key={c} value={c} className="text-[var(--ink)]">
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-message" className={LABEL_CLASS}>
          Message
        </label>
        <textarea
          id="contact-message"
          required
          maxLength={2000}
          rows={6}
          placeholder="How can we help?"
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          disabled={submitting}
          className={`${FIELD_CLASS} resize-y`}
        />
      </div>

      {status === "error" && error && (
        <p role="alert" className="text-[14px] text-[var(--destructive)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn big justify-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending\u2026" : "Send message"}
        {!submitting && <ArrowRight className="ml-2 inline h-4 w-4" aria-hidden />}
      </button>
    </form>
  );
}
