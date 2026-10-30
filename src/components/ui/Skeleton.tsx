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

// ── Page-level skeletons ─────────────────────────────────────
// Shaped like the real pages so content swaps in without a layout jump.

/** Title + subtitle row that sits at the top of most dashboard pages. */
export function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {action && <Skeleton className="h-10 w-36 rounded-lg" />}
    </div>
  );
}

function PageShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-6">
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Header, a row of filter chips, then stacked list cards (contracts, proposals, jobs). */
export function ListPageSkeleton({ rows = 4, action = false }: { rows?: number; action?: boolean }) {
  return (
    <PageShell label="Loading page">
      <PageHeaderSkeleton action={action} />
      <div className="flex gap-2 overflow-hidden">
        {[16, 20, 24, 20, 16].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border border-kampmax-border bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}

/** Header followed by a responsive card grid (services, portfolio). */
export function GridPageSkeleton({ items = 6, action = true }: { items?: number; action?: boolean }) {
  return (
    <PageShell label="Loading page">
      <PageHeaderSkeleton action={action} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-kampmax-border bg-white">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

/** Header, stat cards, then a table (earnings, transactions, payouts). */
export function FinancePageSkeleton() {
  return (
    <PageShell label="Loading page">
      <PageHeaderSkeleton />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <LoadingSkeleton variant="cards" rows={3} />
      <LoadingSkeleton variant="table" rows={5} />
    </PageShell>
  );
}

/** Back link, title block, then a main column with a side card (detail pages). */
export function DetailPageSkeleton() {
  return (
    <PageShell label="Loading details">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-kampmax-border bg-white p-5 lg:col-span-2">
          {[100, 92, 96, 70, 84].map((w, i) => (
            <Skeleton key={i} className="h-3.5" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="rounded-xl border border-kampmax-border bg-white">
          <LoadingSkeleton variant="detail" rows={4} />
        </div>
      </div>
    </PageShell>
  );
}

/** Header followed by stacked form sections (profile, settings, verification). */
export function FormPageSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <PageShell label="Loading page">
      <PageHeaderSkeleton />
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-xl border border-kampmax-border bg-white p-5">
          <Skeleton className="h-4 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </PageShell>
  );
}
