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
      // no-op. Fire on any signup flow: email signup routes to `/onboarding`,
      // while OAuth signup carries `?signup=1` (its `next` may instead be the
      // chosen course's schedule). Recovery flows (e.g. `/reset-password`) set
      // neither, so password resets never trigger a "welcome".
      const userId = data.session?.user?.id;
      const isSignup = searchParams.get("signup") === "1";
      if (userId && (isSignup || next === "/onboarding")) {
        await fireFirstTimeNotification(userId, "system.welcome");
      }

      // Record the marketing opt-in captured at signup. Two sources converge
      // here: OAuth carries the checkbox state as `?consent=1` (it can't set
      // user_metadata before the account exists), while email signup stashes it
      // in `marketing_consent` metadata. Only ever *set* the opt-in — never flip
      // an existing `true` to `false` — so a returning user re-authenticating
      // keeps their prior choice. The row already exists (created by the
      // `handle_new_user` trigger on auth.users insert), so this is an update.
      const optedIn =
        searchParams.get("consent") === "1" ||
        data.session?.user?.user_metadata?.marketing_consent === true;
      if (userId && optedIn) {
        await supabase
          .from("users")
          .update({
            marketing_email_consent: true,
            marketing_consent_updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
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
