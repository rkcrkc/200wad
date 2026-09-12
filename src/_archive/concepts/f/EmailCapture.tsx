"use client";

import { useState } from "react";
import { Gift } from "lucide-react";

/**
 * "Get a mystery gift" email capture — UI ONLY, laid out horizontally.
 * TODO: wire to a real capture endpoint/table before shipping. Right now the
 * submit just shows a success state; no email is stored or sent.
 */
export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <div className="card p-6 sm:p-8">
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--marker)]">
            <Gift className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl-semibold">Get a mystery gift</h2>
            <p className="text-[15px] ink-soft">
              Pop your email in and we&rsquo;ll send you a little something.
            </p>
          </div>
        </div>

        {done ? (
          <p className="text-[15px] font-medium md:text-right">
            Nice one — keep an eye on your inbox. 🎁
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setDone(true);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="w-full rounded-[12px] border-2 border-[var(--ink)] bg-white px-4 py-3 text-[15px] outline-none focus-visible:outline-[color:var(--accent)] sm:w-64"
            />
            <button type="submit" className="btn whitespace-nowrap">
              Send it over
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
