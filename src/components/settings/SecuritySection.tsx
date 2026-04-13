"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  updateEmail,
  updatePassword,
  verifyCurrentPassword,
  toggleTwoFactor,
} from "@/lib/mutations/settings";

interface SecuritySectionProps {
  email: string;
  twoFactorEnabled: boolean;
}

export function SecuritySection({
  email,
  twoFactorEnabled: initialTwoFactor,
}: SecuritySectionProps) {
  const [isPending, startTransition] = useTransition();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactor);

  // Email form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(email);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Password form state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 2FA state
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

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
    setEmailSuccess(false);

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
      const result = await updateEmail(trimmed);
      if (result.success) {
        setEmailSuccess(true);
        setCurrentEmail(trimmed);
        setNewEmail("");
        setShowEmailForm(false);
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = setTimeout(() => setEmailSuccess(false), 5000);
      } else {
        setEmailError(result.error || "Failed to update email");
      }
    });
  };

  const handlePasswordChange = () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validate passwords
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      // First verify current password
      const verifyResult = await verifyCurrentPassword(email, currentPassword);
      if (!verifyResult.success) {
        setPasswordError(verifyResult.error || "Current password is incorrect");
        return;
      }

      // Then update to new password
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
      } else {
        setPasswordError(updateResult.error || "Failed to update password");
      }
    });
  };

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactorError(null);

    startTransition(async () => {
      const result = await toggleTwoFactor(enabled);
      if (result.success) {
        setTwoFactorEnabled(enabled);
      } else {
        setTwoFactorError(result.error || "Failed to update 2FA setting");
      }
    });
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-card">
      <h2 className="mb-6 text-xl font-semibold">Security</h2>

      {/* Email */}
      <div className="mb-6 border-b border-gray-200 pb-6">
        <h3 className="mb-2 font-medium">Email</h3>

        {emailSuccess && (
          <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-600">
            Confirmation email sent to {currentEmail}. Please check your inbox to verify the change.
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-700">
          <Mail className="h-4 w-4 text-gray-500" />
          <span>{currentEmail}</span>
        </div>

        {!showEmailForm ? (
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
            Password updated successfully!
          </div>
        )}

        {!showPasswordForm ? (
          <Button
            variant="link"
            onClick={() => setShowPasswordForm(true)}
            className="h-auto p-0 text-primary"
          >
            Change password
          </Button>
        ) : (
          <div className="space-y-3">
            {passwordError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {passwordError}
              </div>
            )}

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
                {isPending ? "Updating..." : "Update Password"}
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
          <Switch
            checked={twoFactorEnabled}
            onCheckedChange={handleTwoFactorToggle}
            disabled={isPending}
          />
        </div>
        <p className="text-sm text-gray-600">
          2FA is {twoFactorEnabled ? "enabled" : "disabled"} on your account.
        </p>
        {twoFactorError && (
          <p className="mt-2 text-sm text-red-600">{twoFactorError}</p>
        )}
        {twoFactorEnabled && (
          <p className="mt-2 text-sm text-gray-500">
            Note: Full 2FA implementation requires additional setup with an
            authenticator app.
          </p>
        )}
      </div>

      {/* Connected Accounts - Coming Soon */}
      <div>
        <h3 className="mb-2 font-medium">Connected accounts</h3>
        <p className="mb-3 text-sm text-gray-600">
          Connect your social accounts for easier login.
        </p>
        <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
          Social login connections coming soon
        </div>
      </div>
    </div>
  );
}
