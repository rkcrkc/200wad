import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to the specified next page (e.g., /reset-password for recovery)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Check for error in URL (Supabase may send error params)
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    // Redirect with error info
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
