import { redirect } from "next/navigation";
import { getCurrentCourse } from "@/lib/queries";

/**
 * Redirect to the user's default course schedule.
 * The actual schedule page is now at /course/[courseId]/schedule
 */
export default async function SchedulePage() {
  // Get the user's current course
  const { course } = await getCurrentCourse();

  // If no course available, redirect to dashboard to select one
  if (!course) {
    redirect("/dashboard");
  }

  // Redirect to the course-specific schedule
  redirect(`/course/${course.id}/schedule`);
}
