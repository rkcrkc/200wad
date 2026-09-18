"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mail, MailWarning, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateEmail,
  updatePassword,
  verifyCurrentPassword,
  resendEmailChange,
  cancelEmailChange,
} from "@/lib/mutations/settings";
import { connectGoogle, disconnectProvider } from "@/lib/auth/identities";
import { getPasswordError } from "@/lib/validations/auth";

interface SecuritySectionProps {
  email: string;
  /** True when the account has a password login (`email` identity). */
  hasPassword: boolean;
  /** True when a Google identity is linked to the account. */
  googleConnected: boolean;
  /**
   * The address of an in-flight email change awaiting confirmation, or null.
   * Drives the persistent pending-change callout. Server-sourced so it survives
   * reloads and clears itself once both inboxes confirm and the page re-reads.
   */
  pendingEmail: string | null;
}

export function SecuritySection({
  email,
  hasPassword,
  googleConnected,
  pendingEmail,
}: SecuritySectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // When the account has no password (Google-only), email + password are
  // effectively managed by Google, so we swap "change email" for a managed note
  // and "change password" for "set a password" (which also unlocks disconnect).
  const emailManagedByGoogle = googleConnected && !hasPassword;

  // Email form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  // The active email is the server-provided prop — it only changes once a
  // pending change is fully confirmed and the page re-reads it.
  const currentEmail = email;
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Pending email-change callout state (resend / cancel / re-check status).
  const [isPendingAction, startPendingAction] = useTransition();
  const [pendingActionError, setPendingActionError] = useState<string | null>(
    null
  );
  const [pendingActionMessage, setPendingActionMessage] = useState<
    string | null
  >(null);

  // Password form state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connected accounts state
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleEmailChange = () => {
    setEmailError(null);

    const trimmed = newEmail.trim();
    if (!trimmed) {
      setEmailError("Please enter a new email address");
      return;
    }

    if (trimmed === currentEmail) {
      setEmailError("New email is the same as your current email");
      return;
    }

    startTransition(async () => {
      const result = await updateEmail(trimmed, window.location.origin);
      if (result.success) {
        // Don't swap the displayed email yet — with Secure email change on, the
        // address stays the old one until BOTH confirmation links are clicked.
        // Refresh so the server re-reads `new_email` and the persistent pending
        // callout below takes over.
        setNewEmail("");
        setShowEmailForm(false);
        setPendingActionError(null);
        setPendingActionMessage(null);
        router.refresh();
      } else {
        setEmailError(result.error || "Failed to update email");
      }
    });
  };

  const handleResendPending = () => {
    setPendingActionError(null);
    setPendingActionMessage(null);
    startPendingAction(async () => {
      const result = await resendEmailChange(window.location.origin);
      if (result.success) {
        setPendingActionMessage("Confirmation links sent again.");
      } else {
        setPendingActionError(result.error || "Couldn't resend the links.");
      }
    });
  };

  const handleCancelPending = () => {
    setPendingActionError(null);
    setPendingActionMessage(null);
    startPendingAction(async () => {
      const result = await cancelEmailChange();
      if (result.success) {
        router.refresh();
      } else {
        setPendingActionError(
          result.error || "Couldn't cancel the email change."
        );
      }
    });
  };

  const handleCheckStatus = () => {
    setPendingActionError(null);
    setPendingActionMessage(null);
    startPendingAction(() => {
      router.refresh();
    });
  };

  const handlePasswordChange = () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validate passwords
    const validationError = getPasswordError(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      // Existing password accounts must confirm their current password first.
      // Google-only accounts are *setting* a first password, so there's nothing
      // to verify — skip straight to the update.
      if (hasPassword) {
        const verifyResult = await verifyCurrentPassword(email, currentPassword);
        if (!verifyResult.success) {
          setPasswordError(verifyResult.error || "Current password is incorrect");
          return;
        }
      }

      const updateResult = await updatePassword(newPassword);
      if (updateResult.success) {
        setPasswordSuccess(true);
        setShowPasswordForm(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Clear any existing timeout before setting a new one
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = setTimeout(() => setPasswordSuccess(false), 3000);
        // A newly-set password gives Google-only users a fallback login, which
        // unlocks "Disconnect". Refresh so the server re-reads identities.
        if (!hasPassword) {
          router.refresh();
        }
      } else {
        setPasswordError(updateResult.error || "Failed to update password");
      }
    });
  };

  const handleConnectGoogle = async () => {
    setIdentityError(null);
    setIsConnecting(true);
    const result = await connectGoogle();
    // On success the browser redirects to Google, so we only land here on error.
    if (!result.success) {
      setIdentityError(result.error || "Couldn't connect Google. Try again.");
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIdentityError(null);
    setIsDisconnecting(true);
    const result = await disconnectProvider("google");
    setIsDisconnecting(false);
    setShowDisconnectConfirm(false);
    if (result.success) {
      router.refresh();
    } else {
      setIdentityError(result.error || "Couldn't disconnect Google. Try again.");
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-4 sm:p-6 shadow-card">
      <h2 className="mb-6 text-xl font-semibold">Security</h2>

      {/* Pending email-change callout — persists until both inboxes confirm and
          the server re-reads a cleared new_email, or the user cancels. */}
      {pendingEmail && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <MailWarning className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-amber-900">
                Email change pending
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                You&apos;re changing your email to{" "}
                <span className="font-medium break-all">{pendingEmail}</span>.
                For security, both inboxes must confirm — click the link we sent
                to each address. The change won&apos;t take effect until both are
                done.
              </p>

              <div className="mt-3 space-y-2">
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-amber-200 bg-white/60 px-3 py-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1 truncate text-gray-700">
                    {currentEmail}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-amber-700">
                    Check this inbox
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-amber-200 bg-white/60 px-3 py-2 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1 truncate text-gray-700">
                    {pendingEmail}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-amber-700">
                    Check this inbox
                  </span>
                </div>
              </div>

              {pendingActionError && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {pendingActionError}
                </div>
              )}
              {pendingActionMessage && (
                <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-600">
                  {pendingActionMessage}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleResendPending}
                  disabled={isPendingAction}
                >
                  {isPendingAction ? "Working..." : "Resend links"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckStatus}
                  disabled={isPendingAction}
                >
                  Check status again
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleCancelPending}
                  disabled={isPendingAction}
                  className="h-auto p-0 text-destructive"
                >
                  Cancel change
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email */}
      <div className="mb-6 border-b border-gray-200 pb-6">
        <h3 className="mb-2 font-medium">Email</h3>

        <div className="flex min-w-0 items-center gap-2 text-gray-700">
          <Mail className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate">{currentEmail}</span>
          {emailManagedByGoogle && <GoogleBadge />}
        </div>

        {emailManagedByGoogle ? (
          <p className="mt-1 text-sm text-gray-500">
            Managed by your Google account.
          </p>
        ) : !showEmailForm ? (
          <Button
            variant="link"
            onClick={() => setShowEmailForm(true)}
            className="mt-1 h-auto p-0 text-primary"
          >
            Change email
          </Button>
        ) : (
          <div className="mt-3 space-y-3">
            {emailError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {emailError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                New Email
              </label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail("");
                  setEmailError(null);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleEmailChange} disabled={isPending}>
                {isPending ? "Updating..." : "Update Email"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Password Section */}
      <div className="mb-6 border-b border-gray-200 pb-6">
        <h3 className="mb-2 font-medium">Password</h3>

        {passwordSuccess && (
          <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-600">
            {hasPassword ? "Password updated successfully!" : "Password set successfully!"}
          </div>
        )}

        {!hasPassword && !showPasswordForm && (
          <p className="mb-2 text-sm text-gray-600">
            You signed in with Google and don&apos;t have a password yet. Set one
            so you can also log in with your email — and disconnect Google if you
            ever want to.
          </p>
        )}

        {!showPasswordForm ? (
          <Button
            variant="link"
            onClick={() => setShowPasswordForm(true)}
            className="h-auto p-0 text-primary"
          >
            {hasPassword ? "Change password" : "Set a password"}
          </Button>
        ) : (
          <div className="space-y-3">
            {passwordError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {passwordError}
              </div>
            )}

            {hasPassword && (
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError(null);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handlePasswordChange} disabled={isPending}>
                {isPending
                  ? hasPassword
                    ? "Updating..."
                    : "Setting..."
                  : hasPassword
                    ? "Update Password"
                    : "Set Password"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="mb-6 border-b border-gray-200 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-500" />
            <h3 className="font-medium">Two-factor authentication</h3>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Coming soon
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Two-factor authentication isn&apos;t available yet. We&apos;ll let you
          know when you can add an authenticator app to your account.
        </p>
      </div>

      {/* Connected Accounts */}
      <div>
        <h3 className="mb-2 font-medium">Connected accounts</h3>
        <p className="mb-3 text-sm text-gray-600">
          Connect your social accounts for easier login.
        </p>

        {identityError && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {identityError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <GoogleGlyph className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-gray-800">Google</p>
              {googleConnected ? (
                <p className="truncate text-sm text-green-600">
                  Connected{currentEmail ? ` · ${currentEmail}` : ""}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not connected</p>
              )}
            </div>
          </div>

          {googleConnected ? (
            hasPassword ? (
              showDisconnectConfirm ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisconnectConfirm(false)}
                    disabled={isDisconnecting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnectGoogle}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? "Disconnecting..." : "Confirm"}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIdentityError(null);
                    setShowDisconnectConfirm(true);
                  }}
                >
                  Disconnect
                </Button>
              )
            ) : (
              <div className="max-w-[16rem] text-right text-xs text-gray-500">
                Set a password first so you can still sign in.
              </div>
            )
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectGoogle}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small pill shown next to a Google-managed email. */
function GoogleBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      <GoogleGlyph className="h-3 w-3" />
      Google
    </span>
  );
}

/** Google "G" logo. Shared between the badge and the connected-accounts row. */
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
