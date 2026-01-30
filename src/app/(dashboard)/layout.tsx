import { DashboardContent } from "@/components/DashboardContent";
import { getDueTestsCount, getCurrentCourse } from "@/lib/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch due tests count for sidebar badge
  const { course } = await getCurrentCourse();
  const dueTestsCount = course ? await getDueTestsCount(course.id) : 0;

  return (
    <div className="min-h-screen bg-white">
      <DashboardContent dueTestsCount={dueTestsCount}>
        {children}
      </DashboardContent>
    </div>
  );
}
