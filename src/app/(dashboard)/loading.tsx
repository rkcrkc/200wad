import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic dashboard loading fallback. Applies to any (dashboard) route
 * that doesn't have its own loading.tsx. The Sidebar/Header from the
 * dashboard layout stay mounted — only this fallback replaces the page
 * content while the server renders.
 *
 * Modelled on the My Languages page (the most common consumer when a user
 * lands without a saved current course), which is a 1/2/3-column card grid
 * under a page header.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-content-md pt-[80px]">
      {/* Page header */}
      <div className="mb-8">
        <Skeleton className="mb-3 h-10 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Card grid (matches My Languages) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
