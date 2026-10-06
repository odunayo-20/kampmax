"use client";

import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-neutral-200/70", className)} />
  );
}

/** Skeleton for the storefront header (cover + identity). */
export function StoreHeaderSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-kampmax-border bg-white">
      <Skeleton className="h-40 w-full rounded-none sm:h-56 lg:h-64" />
      <div className="-mt-12 px-4 pb-6 sm:-mt-14 sm:px-8">
        <Skeleton className="h-24 w-24 rounded-2xl ring-4 ring-white sm:h-28 sm:w-28" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the storefront nav. */
export function StoreNavSkeleton() {
  return (
    <div className="flex gap-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-9 w-20 rounded-lg" />
      ))}
    </div>
  );
}

/** Skeleton product grid. */
export function StoreProductsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-kampmax-border overflow-hidden">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
