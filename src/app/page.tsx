import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  }

  // No current course set - go to My Languages to pick one
  redirect("/dashboard");
}
