import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isProductionHost } from "@/lib/host";

/**
 * Host-aware `/robots.txt`.
 *
 * Only the locked production hosts (apex + app) are crawlable. Every other host —
 * staging (`staging.200words-a-day.com`, `app-staging.200words-a-day.com`),
 * `*.vercel.app` previews, and localhost — returns a blanket `Disallow: /` so
 * non-production content never gets indexed or competes with production in search
 * results. Reading `headers()` makes this route dynamic (evaluated per request).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");

  if (!isProductionHost(host)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return { rules: { userAgent: "*", allow: "/" } };
}
