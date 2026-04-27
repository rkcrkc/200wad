import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fireFirstTimeNotification } from "@/lib/notifications/achievements";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Best-effort welcome notification. `fireFirstTimeNotification` is
      // idempotent (only fires if no prior notification has the same
      // template_key) so re-running on subsequent magic-link logins is a
      // no-op. Skip the recovery flow path so password resets don't
      // accidentally trigger a "welcome".
      const userId = data.session?.user?.id;
      if (userId && next === "/onboarding") {
        await fireFirstTimeNotification(userId, "system.welcome");
      }
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
