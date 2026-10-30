import { LoadingSkeleton, Skeleton } from "@/components/admin/LoadingSkeleton";

/**
 * Instant fallback for any vendor route while its page loads. It renders inside
 * the vendor layout, so the sidebar and topbar stay in place.
 */
export default function VendorLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <LoadingSkeleton variant="cards" rows={4} />
      <LoadingSkeleton variant="table" rows={5} />
    </div>
  );
}
