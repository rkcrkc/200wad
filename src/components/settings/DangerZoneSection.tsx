"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LogOut } from "lucide-react";
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

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
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

      {/* Delete Account */}
      <div className="mb-6 border-b border-gray-200 pb-6">
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

      {/* Log Out */}
      <div>
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
    </div>
  );
}
