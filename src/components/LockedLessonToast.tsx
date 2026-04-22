"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Reads `?locked=<title>` from the URL, shows a toast, and cleans up the param.
 */
export function LockedLessonToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locked = searchParams.get("locked");

  useEffect(() => {
    if (!locked) return;

    toast.error(`"${locked}" requires a subscription.`);

    // Remove the param to prevent re-show on refresh
    const params = new URLSearchParams(searchParams.toString());
    params.delete("locked");
    const qs = params.toString();
    const newPath = window.location.pathname + (qs ? `?${qs}` : "");
    router.replace(newPath, { scroll: false });
  }, [locked, router, searchParams]);

  return null;
}
