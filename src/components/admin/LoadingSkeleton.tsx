import { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn("skeleton-shimmer rounded-md", className)}
    />
  );
}

/** Standard loading block for page content areas. */
export function LoadingSkeleton({
  variant = "table",
  rows = 6,
  className,
}: {
  variant?: "table" | "cards" | "detail" | "chart";
  rows?: number;
  className?: string;
}) {
  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-lg border border-kampmax-border bg-white p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-7 w-28" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={cn("rounded-lg border border-kampmax-border bg-white p-5", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-40 rounded-md" />
        </div>
        <div className="mt-5 flex h-48 items-end gap-1.5">
          {[38, 62, 45, 80, 55, 70, 92, 60, 75, 50, 84, 66].map((h, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={cn("space-y-4 p-5", className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-b border-kampmax-border/70 pb-3">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-kampmax-border bg-white", className)}>
      <div className="border-b border-kampmax-border bg-kampmax-muted/50 px-4 py-2.5">
        <div className="flex gap-6">
          {["Name", "Status", "Campus", "Date", ""].map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-kampmax-border/70">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3">
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="hidden h-3.5 w-16 sm:block" />
            <Skeleton className="hidden h-3.5 w-20 md:block" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
