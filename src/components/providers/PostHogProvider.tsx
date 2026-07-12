"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useConsent } from "@/context/ConsentContext";

// Module-level guard so we only ever call posthog.init() once, even across
// re-renders/route changes. PostHog only loads AFTER the user grants analytics
// consent (prior opt-in) — nothing is set before then.
let posthogInitialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();

  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return;
    }

    if (consent.analytics) {
      if (!posthogInitialized) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: false, // We'll capture manually for better SPA support
          capture_pageleave: true,
        });
        posthogInitialized = true;
      } else {
        posthog.opt_in_capturing();
      }
    } else if (posthogInitialized) {
      // Consent withdrawn after a prior accept — stop capturing.
      posthog.opt_out_capturing();
    }
  }, [consent.analytics]);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
