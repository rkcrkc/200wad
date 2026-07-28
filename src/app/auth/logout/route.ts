import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  // Build the redirect response up front so Supabase can write the
  // session-clearing cookies directly onto it. Returning a *separate*
  // NextResponse.redirect (as before) meant the cleared-cookie headers didn't
  // reliably attach, so the browser kept the session and middleware bounced the
  // user straight back off /login into the app.
  const response = NextResponse.redirect(`${origin}/login`, { status: 302 });

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // `scope: "local"` clears the session cookies without a round-trip to the
  // Supabase auth server — so a flaky network (see occasional ENOTFOUND to
  // supabase.co in dev) can't throw and 500 the logout. Wrapped defensively so
  // we always land on the redirect regardless.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore — cookies are cleared via setAll above; still redirect to /login.
  }

  return response;
}

// Also support GET for simple logout links
export async function GET(request: Request) {
  return POST(request);
}
