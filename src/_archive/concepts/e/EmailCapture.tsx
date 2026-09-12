"use client";

import { useState } from "react";
import { Gift } from "lucide-react";

/**
 * "Get a mystery gift" email capture — UI ONLY.
 * TODO: wire to a real capture endpoint/table before shipping. Right now the
 * submit just shows a success state; no email is stored or sent.
 */
export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <div className="card p-6 text-center sm:p-10" style={{ background: "var(--pink-soft)" }}>
      <span className="grid mx-auto h-12 w-12 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--marker)]">
        <Gift className="h-6 w-6" />
      </span>
      <h2 className="h-sec mt-4">Get a mystery gift</h2>

      {done ? (
        <p className="mx-auto mt-4 max-w-md text-lg font-medium">
          Nice one — keep an eye on your inbox for your mystery gift. 🎁
        </p>
      ) : (
        <>
          <p className="mx-auto mt-3 max-w-md text-[15px] ink-soft">
            Pop your email in and we&rsquo;ll send you a little something. No spam, promise.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setDone(true);
            }}
            className="mx-auto mt-5 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="flex-1 rounded-[var(--r-sm)] border-2 border-[var(--ink)] bg-white px-4 py-3 text-[15px] outline-none focus-visible:outline-[color:var(--accent)]"
            />
            <button type="submit" className="btn">
              Send it over
            </button>
          </form>
        </>
      )}
    </div>
  );
}
