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

      // If the `next` param was lost (fell back to the default) but signup stashed
      // the initial course selection on the user record, recover it so the user
      // lands directly in their chosen language's schedule instead of generic
      // onboarding. The schedule page assigns the language on first landing.
      let destination = next;
      if (next === "/onboarding") {
        const onboardingCourseId =
          data.session?.user?.user_metadata?.onboarding_course_id;
        if (typeof onboardingCourseId === "string" && onboardingCourseId) {
          destination = `/course/${onboardingCourseId}/schedule`;
        }
      }

      // Redirect to the resolved destination (e.g., /reset-password for recovery)
      return NextResponse.redirect(`${origin}${destination}`);
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
