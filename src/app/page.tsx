import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enrollLanguageAndSetCurrent } from "@/lib/mutations";
import { DEFAULT_COURSE_ID } from "@/lib/constants";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
