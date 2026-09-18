import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLanguagesWithCourses } from "@/lib/queries/onboarding";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guests don't onboard here — the language picker + signup modal lives on the
  // default course schedule. Send them to the root redirect, which routes them there.
  if (!user) {
    redirect("/");
  }

  // Already enrolled: nothing to onboard, go straight to their schedule.
  const { data: userData } = await supabase
    .from("users")
    .select("current_course_id")
    .eq("id", user.id)
    .single();

  if (userData?.current_course_id) {
    redirect(`/course/${userData.current_course_id}/schedule`);
  }

  // Newly-authenticated user with no course yet (e.g. a "Continue with Google"
  // signup, which can't carry a language selection through OAuth). Show the
  // language picker. OnboardingClient navigates to the chosen course's schedule,
  // where the server enrols a logged-in user that has no language set.
  const languages = await getLanguagesWithCourses();
  return <OnboardingClient languages={languages} />;
}
