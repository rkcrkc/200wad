"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";

export function DangerZoneSection() {
  const router = useRouter();
  const { signOut } = useUser();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isResetPending, startResetTransition] = useTransition();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleResetAccount = () => {
    if (resetConfirmText !== "RESET") {
      setResetError('Please type "RESET" to confirm');
      return;
    }

    setResetError(null);

    startResetTransition(async () => {
      try {
        const response = await fetch("/api/account/reset", {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          setResetError(data.error || "Failed to reset account");
          return;
        }

        setResetSuccess(true);
        setShowResetConfirm(false);
        setResetConfirmText("");
        // Reload so all in-memory state reflects the reset.
        router.refresh();
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      } catch (err) {
        console.error("Error resetting account:", err);
        setResetError("An unexpected error occurred");
      }
    });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") {
      setError('Please type "DELETE" to confirm');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/account/delete", {
          method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to delete account");
          return;
        }

        // Redirect to home page after successful deletion
        router.push("/");
      } catch (err) {
        console.error("Error deleting account:", err);
        setError("An unexpected error occurred");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6">
      <h2 className="mb-6 text-xl font-semibold text-red-600">Danger Zone</h2>

      {/* Log Out */}
      <div className="mb-6 border-b border-gray-200 pb-6">
        <h3 className="mb-3 font-medium">Log out</h3>
        <p className="mb-4 text-sm text-gray-600">
          Sign out of your account on this device.
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-red-600 text-red-600 hover:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </div>

      {/* Reset Account */}
      <div className="mb-6 border-b border-gray-200 pb-6">
        <h3 className="mb-3 font-medium">Reset account</h3>
        <p className="mb-4 text-sm text-gray-600">
          Wipe all of your study and test data and start over from day 1. Your
          word and lesson progress, study sessions, test scores, streaks,
          league standing, and notifications will be permanently erased. Your
          profile, subscription, credits, and language selection are kept.
          This action cannot be undone.
        </p>

        {resetSuccess ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Account reset. Redirecting…
          </div>
        ) : !showResetConfirm ? (
          <Button
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset account
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Are you sure? All of your progress will be erased and cannot be
              recovered.
            </p>

            {resetError && (
              <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
                {resetError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-red-700">
                Type <span className="font-bold">RESET</span> to confirm
              </label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="border-red-300 focus:border-red-500 focus:ring-red-500/20"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetConfirmText("");
                  setResetError(null);
                }}
                disabled={isResetPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetAccount}
                disabled={isResetPending || resetConfirmText !== "RESET"}
              >
                {isResetPending ? "Resetting..." : "Reset account"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account */}
      <div>
        <h3 className="mb-3 font-medium">Delete account</h3>
        <p className="mb-4 text-sm text-gray-600">
          Deleting your account is permanent. You will immediately lose access
          to all your data, progress, and settings. This action cannot be
          undone.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete account
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Are you absolutely sure? This action is irreversible.
            </p>

            {error && (
              <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-red-700">
                Type <span className="font-bold">DELETE</span> to confirm
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="border-red-300 focus:border-red-500 focus:ring-red-500/20"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                  setError(null);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isPending || deleteConfirmText !== "DELETE"}
              >
                {isPending ? "Deleting..." : "Permanently Delete Account"}
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
