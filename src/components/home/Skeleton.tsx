import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-kampmax-muted rounded animate-pulse", className)} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-kampmax-border overflow-hidden">
      <Skeleton className="aspect-square" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardHorizontalSkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px] bg-white rounded-lg border border-kampmax-border overflow-hidden">
      <Skeleton className="aspect-square" />
      <div className="p-2 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function VendorCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[200px] bg-white rounded-lg border border-kampmax-border p-3">
      <div className="flex items-center gap-2.5 mb-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-4 w-14 rounded" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[260px] bg-white rounded-lg border border-kampmax-border p-3 space-y-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-kampmax-border">
      <Skeleton className="h-8 w-8 rounded" />
      <Skeleton className="h-3 w-14" />
      <Skeleton className="h-2.5 w-10" />
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-kampmax-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>
    </div>
  );
}

// ── Whole-section placeholders for the home page ────────────────
// Each is framed like the real section (a title row, then content of the same shape), so
// the page doesn't jump when the data arrives.

function SectionFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={`Loading ${label}`} className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      {children}
    </div>
  );
}

/** Product / service cards in the home grid: two across on phones, four on large screens. */
export function CardGridSkeleton({ label, count = 4 }: { label: string; count?: number }) {
  return (
    <SectionFrame label={label}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </SectionFrame>
  );
}

/** A sideways-scrolling row of vendor or event cards. */
export function ScrollRowSkeleton({
  label,
  item,
  count = 4,
}: {
  label: string;
  item: "vendor" | "event";
  count?: number;
}) {
  const Item = item === "vendor" ? VendorCardSkeleton : EventCardSkeleton;
  return (
    <SectionFrame label={label}>
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:px-0">
        {Array.from({ length: count }).map((_, i) => (
          <Item key={i} />
        ))}
      </div>
    </SectionFrame>
  );
}

/** The category tiles: four across on phones, eight on large screens. */
export function CategoryGridSkeleton() {
  return (
    <SectionFrame label="categories">
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <CategorySkeleton key={i} />
        ))}
      </div>
    </SectionFrame>
  );
}

/** The round store avatars at the top of the page. */
export function StoryReelSkeleton() {
  return (
    <div role="status" aria-label="Loading popular stores" className="space-y-2.5">
      <Skeleton className="h-4 w-32" />
      <div className="-mx-4 flex gap-3.5 overflow-hidden px-4 sm:mx-0 sm:px-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
            <Skeleton className="h-[60px] w-[60px] rounded-full" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { Skeleton };

/** Gig cards: short text cards, one column on phones and four on large screens. */
export function GigGridSkeleton() {
  return (
    <SectionFrame label="gigs">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-kampmax-border bg-white p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}
