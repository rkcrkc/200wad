"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Self-serve "download my data" control (GDPR right of access / portability).
 * Fetches the export from /api/account/export and saves it as a JSON file.
 */
export function DataExportSection() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleExport = () => {
    setError(null);
    setDone(false);
    startTransition(async () => {
      try {
        const response = await fetch("/api/account/export");
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || "Could not prepare your export");
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `200wad-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setDone(true);
        setTimeout(() => setDone(false), 4000);
      } catch (err) {
        console.error("Error exporting data:", err);
        setError("An unexpected error occurred");
      }
    });
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-card">
      <h2 className="mb-6 text-xl font-semibold">Your data</h2>

      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="font-medium">Download my data</h3>
          <p className="text-sm text-gray-600">
            Get a copy of the personal data we hold about you — your profile, learning progress,
            sessions and account activity — as a JSON file.
          </p>
          {error && <p className="mt-2 text-small-regular text-destructive">{error}</p>}
        </div>
        <div className="shrink-0">
          <Button variant="outline" onClick={handleExport} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            {isPending ? "Preparing…" : done ? "Downloaded" : "Download my data"}
          </Button>
        </div>
      </div>
    </div>
  );
}
