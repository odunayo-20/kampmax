"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/admin/LoadingSkeleton";

interface FinancialsSkeletonProps {
  className?: string;
  /** Omit when the page already renders its own real heading above the skeleton. */
  showHeading?: boolean;
}

export function FinancialsSkeleton({ className, showHeading = true }: FinancialsSkeletonProps) {
  return (
    <div aria-busy="true" aria-label="Loading financials" className={cn("space-y-6", className)}>
      {showHeading && <Skeleton className="h-8 w-48" />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-kampmax-border bg-white p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="h-12 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
