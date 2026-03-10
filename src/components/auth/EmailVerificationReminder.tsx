"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";

interface EmailVerificationReminderProps {
  /** Time in milliseconds before showing the reminder (default: 3 minutes) */
  delayMs?: number;
}

export function EmailVerificationReminder({
  delayMs = 3 * 60 * 1000, // 3 minutes default
}: EmailVerificationReminderProps) {
  const { user } = useUser();
  const [showReminder, setShowReminder] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Check if email is unverified and start timer
  useEffect(() => {
    if (!user) return;

    // If email is already confirmed, don't show reminder
    if (user.email_confirmed_at) return;

    // Check localStorage for when signup happened
    const signupTime = localStorage.getItem("signup_timestamp");
    const now = Date.now();

    if (!signupTime) {
      // Set signup timestamp if not present
      localStorage.setItem("signup_timestamp", now.toString());
    }

    const elapsed = signupTime ? now - parseInt(signupTime, 10) : 0;
    const remainingDelay = Math.max(0, delayMs - elapsed);

    // Show reminder after delay
    const timer = setTimeout(() => {
      // Re-check verification status before showing
      supabase.auth.getUser().then(({ data }) => {
        if (data.user && !data.user.email_confirmed_at) {
          setShowReminder(true);
        }
      });
    }, remainingDelay);

    return () => clearTimeout(timer);
  }, [user, delayMs, supabase.auth]);

  // Clear signup timestamp when email is verified
  useEffect(() => {
    if (user?.email_confirmed_at) {
      localStorage.removeItem("signup_timestamp");
      setShowReminder(false);
    }
  }, [user?.email_confirmed_at]);

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setResending(true);
    setError(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });

    if (error) {
      setError(error.message);
    } else {
      setResent(true);
    }

    setResending(false);
  };

  if (!showReminder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white">
        {/* Header */}
        <div className="bg-[#EDE8DF] px-8 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <svg
              className="h-6 w-6 text-warning"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Verify your email</h2>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <p className="mb-4 text-center text-muted-foreground">
            Please verify your email address to continue using 200 Words a Day.
            We sent a confirmation link to:
          </p>
          <p className="mb-6 text-center font-medium">{user?.email}</p>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {resent ? (
            <div className="mb-4 rounded-lg bg-success/10 p-3 text-center text-sm text-success">
              Verification email sent! Check your inbox.
            </div>
          ) : (
            <Button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full"
              size="lg"
            >
              {resending ? "Sending..." : "Resend verification email"}
            </Button>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Can&apos;t find the email? Check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
}
