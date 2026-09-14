/**
 * Host-based routing helpers for the apex (marketing) ⇄ app (subdomain) split.
 *
 * Production runs one Vercel deployment behind two domains:
 *   - apex `200wad.com`        → the marketing site (Landing page, pricing, legal…)
 *   - app  `app.200wad.com`    → the authenticated product
 *
 * Locally and on `*.vercel.app` previews the split doesn't exist, so we fall back to
 * **combined** mode — every route served from one host, no cross-host redirects, and
 * the cross-boundary link helpers return relative paths. Combined is also the default
 * whenever the env isn't fully configured, so nothing breaks if a var is missing.
 *
 * Configure per Vercel environment (Production only; leave UNSET on Preview/dev so
 * previews stay in combined mode):
 *   NEXT_PUBLIC_MARKETING_URL = https://200wad.com
 *   NEXT_PUBLIC_APP_URL       = https://app.200wad.com
 */

const MARKETING_ORIGIN = process.env.NEXT_PUBLIC_MARKETING_URL;
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL;

export type HostKind = "apex" | "app" | "combined";

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "");
}

function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return undefined;
  }
}

/**
 * Classify an incoming request host. Returns `"combined"` (today's behaviour, no
 * host gating) unless BOTH production hosts are configured AND the host matches one
 * of them. `www.<apex>` is treated as apex.
 */
export function classifyHost(host: string | null | undefined): HostKind {
  if (!host) return "combined";
  const h = normalizeHost(host);
  const appHost = hostOf(APP_ORIGIN);
  const apexHost = hostOf(MARKETING_ORIGIN);
  if (!appHost || !apexHost) return "combined";
  if (h === appHost) return "app";
  if (h === apexHost || h === `www.${apexHost}`) return "apex";
  return "combined";
}

/**
 * Canonical production hosts. Search engines should only ever index these; every
 * other host (staging, `*.vercel.app` previews, localhost) is served `noindex`
 * (see `src/app/robots.ts` + the middleware `X-Robots-Tag`) so staging/preview
 * content never competes with production in search results.
 *
 * These are hard-coded rather than env-derived because the split env vars
 * (`NEXT_PUBLIC_MARKETING_URL` / `NEXT_PUBLIC_APP_URL`) are ALSO set on staging —
 * so `classifyHost` can't tell production and staging apart. The apex domain is
 * locked, so the production hostnames are the reliable discriminator.
 */
const PRODUCTION_HOSTS = new Set([
  "200words-a-day.com",
  "www.200words-a-day.com",
  "app.200words-a-day.com",
]);

/** True only for the locked production apex/app hosts, where indexing is allowed. */
export function isProductionHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return PRODUCTION_HOSTS.has(normalizeHost(host));
}

function joinOrigin(origin: string | undefined, path: string): string {
  if (!origin) return path; // combined / dev / preview → same-origin relative link
  const base = origin.replace(/\/+$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

/** URL to a path on the **app** host. Relative in combined mode. */
export function appUrl(path = "/"): string {
  return joinOrigin(APP_ORIGIN, path);
}

/** URL to a path on the **marketing/apex** host. Relative in combined mode. */
export function marketingUrl(path = "/"): string {
  return joinOrigin(MARKETING_ORIGIN, path);
}
