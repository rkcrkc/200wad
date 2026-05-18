import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic dashboard loading fallback. Applies to any (dashboard) route
 * that doesn't have its own loading.tsx. The Sidebar/Header from the
 * dashboard layout stay mounted — only this fallback replaces the page
 * content while the server renders.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-content-md pt-[80px]">
      {/* Page header */}
      <div className="mb-8">
        <Skeleton className="mb-3 h-10 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Generic content blocks */}
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
