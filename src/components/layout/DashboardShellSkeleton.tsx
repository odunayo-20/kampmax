import { Skeleton } from "@/components/ui/Skeleton";

const SIDEBAR_ITEMS = 7;

/**
 * Placeholder for the dashboard shell (sidebar, topbar, page area) shown while a
 * session or an access check is still loading. It has the same geometry as the
 * real shell, so the page doesn't jump when the real shell replaces it.
 *
 * Shared by the freelancer, employer, vendor and service-provider layouts.
 */
export function DashboardShellSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard" className="min-h-screen bg-kampmax-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-kampmax-navy px-4 pt-5 lg:block">
        <div className="h-4 w-32 animate-pulse rounded-md bg-white/10" />
        <div className="mt-4 flex items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-white/10" />
          <div className="h-4 w-28 animate-pulse rounded-md bg-white/10" />
        </div>
        <div className="mt-8 space-y-2">
          {Array.from({ length: SIDEBAR_ITEMS }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 h-14 border-b border-kampmax-border bg-kampmax-navy lg:hidden" />

      <div className="lg:pl-64">
        {/* Desktop topbar */}
        <div className="hidden h-16 border-b border-kampmax-border bg-white lg:block" />

        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </main>
      </div>

      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
