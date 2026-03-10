import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

    // Logged in but no course set - go to My Languages
    redirect("/dashboard");
  }

  // Guest - go to default course schedule (onboarding modal will appear)
  redirect(`/course/${DEFAULT_COURSE_ID}/schedule`);
}
