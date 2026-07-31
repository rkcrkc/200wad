import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
  // never bounce to the app onboarding flow.
  const MARKETING_PREFIXES = [
    "/home",
    "/how-it-works",
    "/pricing",
    "/learn",
    "/with",
    "/for",
    "/guides",
    "/about",
    "/welcome-back",
    "/go",
    "/lp",
    // Public legal pages — linked from signup/footer, must be reachable by
    // logged-out guests (otherwise they bounce to onboarding and read as dead).
    "/terms",
    "/privacy",
    "/refunds",
  ];
  const isMarketingRoute = MARKETING_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isPublicRoute =
    pathname === "/" || isAuthRoute || isGuestSchedule || isMarketingRoute;

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
  // route could run, so the session was never cleared.
  if (user && isAuthRoute && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
