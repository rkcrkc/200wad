"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: string | null;
}

export function ErrorState({ error }: ErrorStateProps) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="mb-4 text-2xl font-semibold text-red-600">
          Error Loading Settings
        </h1>
        <p className="mb-6 text-red-600">
          {error || "Unable to load your settings. Please try again."}
        </p>
        <Button onClick={() => router.refresh()}>Retry</Button>
      </div>
    </div>
  );
}
