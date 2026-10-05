import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listingHref } from "@/lib/blog";
import { cn } from "@/lib/utils";

interface BlogPaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  q?: string;
}

/** Link-based pagination: crawlable, no client JavaScript. */
export function BlogPagination({ page, totalPages, basePath, q }: BlogPaginationProps) {
  if (totalPages <= 1) return null;
  const item = "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border px-3 text-sm font-medium";
  const idle = "border-kampmax-border bg-white text-kampmax-text hover:bg-kampmax-muted";
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={listingHref(basePath, { q, page: page - 1 })} rel="prev" className={cn(item, idle)}>
          <ChevronLeft aria-hidden className="h-4 w-4" /> Previous
        </Link>
      ) : (
        <span aria-hidden className="w-[104px]" />
      )}
      <p className="text-sm text-kampmax-text-secondary" aria-live="polite">
        Page {page} of {totalPages}
      </p>
      {page < totalPages ? (
        <Link href={listingHref(basePath, { q, page: page + 1 })} rel="next" className={cn(item, idle)}>
          Next <ChevronRight aria-hidden className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden className="w-[88px]" />
      )}
    </nav>
  );
}
