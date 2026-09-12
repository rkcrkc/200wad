"use client";

import { useState } from "react";
import { CaseSensitive, ArrowRight, Check } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Section 12 · Email Capture — a light-blue bordered card offering the daily
 * "word of the day" newsletter: a leading icon + heading on the left, an email
 * field + yellow Submit button on the right. Stacks to a single column below lg.
 *
 * The form is self-contained (this concept has no capture endpoint): on a valid
 * address it optimistically confirms; an invalid one shows an inline error.
 */
export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setStatus("error");
      return;
    }
    setStatus("success");
    setEmail("");
  }

  return (
    <section aria-label="Get word of the day" className="bg-[#fffdf7] pb-16 sm:pb-24">
      <div className="container">
        <div className="flex flex-col items-center gap-8 rounded-[14px] border-2 border-[var(--ink)] bg-[#e5f2ff] px-6 py-8 sm:px-10 sm:py-[30px] lg:flex-row lg:justify-center lg:gap-10">
          {/* Leading — round "Aa" icon + heading/subtext. */}
          <div className="flex w-full items-center gap-4 lg:w-[420px]">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)]">
              <CaseSensitive className="h-6 w-6 text-[var(--ink)]" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="heading-ml text-[var(--ink)]">Get word of the day</h2>
              <p className="text-[14px] leading-[1.4] tracking-[-0.01em] text-[var(--ink-soft)]">
                Daily to your email.
              </p>
            </div>
          </div>

          {/* Form / success — occupies the remaining width. */}
          {status === "success" ? (
            <p
              role="status"
              className="flex w-full flex-1 items-center gap-2 text-[15px] font-medium text-[var(--ink)]"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--success)]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden />
              </span>
              You&rsquo;re on the list &mdash; check your inbox to confirm.
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex w-full flex-1 flex-col gap-1.5">
              {/* Input + button share one centred row; the error sits below so it
                  never nudges the button out of line with the input bar. */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  aria-invalid={status === "error"}
                  className="w-full flex-1 rounded-[15px] border-2 border-[var(--ink)] bg-white p-5 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                />
                <button type="submit" className="btn secondary marker w-full justify-center sm:w-auto">
                  Submit
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              {status === "error" && (
                <p role="alert" className="text-[13px] text-[var(--destructive)]">
                  Please enter a valid email address.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
