import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { enrollLanguageAndSetCurrent } from "@/lib/mutations";
import { DEFAULT_COURSE_ID } from "@/lib/constants";
import { classifyHost, appUrl } from "@/lib/host";
import { LandingG, landingMetadata } from "@/components/landing/LandingG";

// On the apex (marketing) host, `/` is the indexed Landing page; everywhere else it's
// the app root redirect, so only emit Landing's SEO metadata on apex.
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  return classifyHost(host) === "apex" ? landingMetadata : {};
}

export default async function Home() {
  // Apex host serves the marketing homepage (even for logged-in users — no
  // auto-forward into the app, per sign-off; the header offers a "go to course" link).
  const host = (await headers()).get("host");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (classifyHost(host) === "apex") {
    // Shared session makes the visitor known here too. Offer a link into the app
    // (their current course, else dashboard) instead of auto-forwarding.
    let courseHref: string | null = null;
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("current_course_id")
        .eq("id", user.id)
        .single();
      courseHref = data?.current_course_id
        ? appUrl(`/course/${data.current_course_id}/schedule`)
        : appUrl("/dashboard");
    }
    return <LandingG courseHref={courseHref} />;
  }

  // App / combined (localhost, previews): today's root-redirect behaviour.
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("current_course_id")
      .eq("id", user.id)
      .single();

    if (userData?.current_course_id) {
      redirect(`/course/${userData.current_course_id}/schedule`);
    }

    // No course set yet. If the email-confirmation flow dropped the `next`
    // param and landed us here, recover the onboarding selection stored on
    // signup, enrol the language, and send the user to their schedule.
    const onboardingLanguageId =
      user.user_metadata?.onboarding_language_id as string | undefined;
    const onboardingCourseId =
      user.user_metadata?.onboarding_course_id as string | undefined;

    if (onboardingLanguageId) {
      const result = await enrollLanguageAndSetCurrent(
        onboardingLanguageId,
        onboardingCourseId
      );
      if (result.success && result.courseId) {
        redirect(`/course/${result.courseId}/schedule`);
      }
    }

    // Logged in but no course could be resolved - go to My Languages
    redirect("/dashboard");
  }

  // Guest - go to default course schedule (onboarding modal will appear)
  redirect(`/course/${DEFAULT_COURSE_ID}/schedule`);
}
