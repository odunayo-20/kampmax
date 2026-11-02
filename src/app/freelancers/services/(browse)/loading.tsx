import { Skeleton } from "@/components/ui/Skeleton";

/** Shown while the browse page loads: the same shape as the page, so nothing jumps. */
export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" role="status" aria-label="Loading services">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-5 h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <Skeleton className="mt-5 h-11 w-full" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="overflow-hidden rounded-xl border border-kampmax-border bg-white">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-4 h-8 w-full" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
