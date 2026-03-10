import { redirect } from "next/navigation";
import { getCurrentCourse } from "@/lib/queries";

/**
 * Redirect to the user's default course dictionary.
 * The actual dictionary page is now at /course/[courseId]/dictionary
 */
export default async function DictionaryPage() {
  // Get the user's current course
  const { course } = await getCurrentCourse();

  // If no course available, redirect to dashboard to select one
  if (!course) {
    redirect("/dashboard");
  }

  // Redirect to the course-specific dictionary
  redirect(`/course/${course.id}/dictionary`);
}
