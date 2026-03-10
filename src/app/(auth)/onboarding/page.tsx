import { redirect } from "next/navigation";
import { DEFAULT_COURSE_ID } from "@/lib/constants";

export default function OnboardingPage() {
  // Redirect to the default course schedule page
  // The onboarding modal will appear there for guests
  redirect(`/course/${DEFAULT_COURSE_ID}/schedule`);
}
