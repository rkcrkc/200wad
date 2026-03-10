import { redirect } from "next/navigation";
import { getCurrentCourse } from "@/lib/queries";

/**
 * Redirect to the user's default course tests.
 * The actual tests page is now at /course/[courseId]/tests
 */
export default async function TestsPage() {
  // Get the user's current course
  const { course } = await getCurrentCourse();

  // If no course available, redirect to dashboard to select one
  if (!course) {
    redirect("/dashboard");
  }

  // Redirect to the course-specific tests
  redirect(`/course/${course.id}/tests`);
}
