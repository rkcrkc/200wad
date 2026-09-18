import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database";
import { classifyHost, appUrl, marketingUrl, isProductionHost } from "@/lib/host";

// Product areas that live on the app subdomain. On the apex (marketing) host these
// 307 to `app.200words-a-day.com{path}`; in combined/dev mode nothing is gated.
const APP_PREFIXES = [
  "/course",
  "/dashboard",
  "/admin",
  "/account",
  "/tests",
  "/dictionary",
  "/schedule",
  "/profile",
  "/settings",
  "/shop",
  "/streak",
  "/trophies",
  "/community",
  "/referrals",
  "/help",
];

// Auth *pages* live on the app host too (per sign-off). NB: `/auth/*` callbacks are
// NOT included — those are functional handlers that must resolve on either host.
const AUTH_PAGE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/join",
];

// Marketing/legal areas that live on the apex host. On the app subdomain these 307
// back to the marketing host so the app stays "app only".
const MARKETING_ONLY_PREFIXES = [
  "/home",
  "/how-it-works",
  "/pricing",
  "/learn",
  "/with",
  "/for",
  "/guides",
  "/about",
  "/contact",
  "/blog",
  "/welcome-back",
  "/go",
  "/lp",
  "/terms",
  "/privacy",
  "/refunds",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Share the auth session across apex + app subdomains. Set to `.200words-a-day.com`
  // in production; unset locally and on previews (localhost can't use that domain).
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes accessible without authentication
  const pathname = request.nextUrl.pathname;

  // ── Host-based split (apex marketing ⇄ app subdomain) ──────────────────────
  // Only active in production where both hosts are configured; "combined"
  // (localhost / previews / unset env) keeps today's single-host behaviour.
  const requestHost = request.headers.get("host");
  const hostKind = classifyHost(requestHost);
  const search = request.nextUrl.search;

  // Belt-and-braces noindex for every non-production host (staging, previews,
  // localhost). robots.txt (src/app/robots.ts) disallows crawling; this header
  // is the stronger signal that also de-indexes anything already discovered.
  // Production apex/app hosts are left untouched so they index normally.
  if (!isProductionHost(requestHost)) {
    supabaseResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  // ── Legacy verb-conjugation pages (SEO Phase B) ────────────────────────────
  // Migrated SBI pages are served at their literal `.html` URL to preserve exact
  // ranking signal. They're marketing content (apex host), rendered by the
  // internal /verbs/[lang]/[slug] route via a rewrite so the URL bar stays
  // `/french-verb-aller.html`. Handled before the auth gate — these are public.
  const verbMatch = pathname.match(
    /^\/(french|spanish|german|italian|welsh)-verb-(.+)\.html$/
  );
  if (verbMatch) {
    if (hostKind === "app") {
      return NextResponse.redirect(marketingUrl(`${pathname}${search}`), 307);
    }
    const url = request.nextUrl.clone();
    url.pathname = `/verbs/${verbMatch[1]}/${verbMatch[2]}`;
    const rewrite = NextResponse.rewrite(url);
    // Carry the refreshed auth cookies + the non-prod noindex header onto the
    // rewrite response so sessions aren't dropped and staging stays noindex.
    supabaseResponse.cookies.getAll().forEach((c) => rewrite.cookies.set(c));
    const robots = supabaseResponse.headers.get("X-Robots-Tag");
    if (robots) rewrite.headers.set("X-Robots-Tag", robots);
    return rewrite;
  }

  if (hostKind === "apex") {
    // Product + auth pages belong on the app subdomain.
    if (matchesPrefix(pathname, APP_PREFIXES) || matchesPrefix(pathname, AUTH_PAGE_PREFIXES)) {
      return NextResponse.redirect(appUrl(`${pathname}${search}`), 307);
    }
    // Everything else on apex (/, marketing/legal, /auth/* callbacks) is served here.
  } else if (hostKind === "app") {
    // Marketing/legal pages belong on the apex host.
    if (matchesPrefix(pathname, MARKETING_ONLY_PREFIXES)) {
      return NextResponse.redirect(marketingUrl(`${pathname}${search}`), 307);
    }
  }

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/join");
  // Allow guests to reach the default course schedule (root redirects there for onboarding)
  const DEFAULT_COURSE_ID = "6d60eb7e-7317-4c18-a0a9-6123cc37d5b8";
  const isGuestSchedule = pathname === `/course/${DEFAULT_COURSE_ID}/schedule`;
  // Public marketing site — logged-out visitors are the audience, so these must
  // never bounce to the app onboarding flow. Same set as the host-redirect list.
  const isMarketingRoute = matchesPrefix(pathname, MARKETING_ONLY_PREFIXES);
  // Crawler metadata files are always fetched unauthenticated, so they must never
  // hit the auth gate (a 307 to `/` makes robots.txt/sitemap.xml unparseable).
  const isMetadataRoute = pathname === "/robots.txt" || pathname === "/sitemap.xml";
  const isPublicRoute =
    pathname === "/" ||
    isAuthRoute ||
    isGuestSchedule ||
    isMarketingRoute ||
    isMetadataRoute;

  // Admin routes require both authentication AND admin role
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    if (!user) {
      // Not authenticated - redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Check for admin role in user metadata
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      // Authenticated but not admin - redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Redirect unauthenticated users to root (onboarding flow)
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth *pages* (login/signup/password).
  // Exclude the /auth/* endpoints (logout, callback): those are functional
  // handlers, not pages. Bouncing them here meant a logout POST — made while the
  // user is still authenticated — got redirected to /dashboard before the logout
  // route could run, so the session was never cleared. Also exclude /onboarding:
  // brand-new authenticated users (e.g. Google OAuth signup, who never picked a
  // language) are sent here to choose one — the page itself forwards anyone who
  // already has a course on to their schedule.
  if (
    user &&
    isAuthRoute &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/onboarding")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
