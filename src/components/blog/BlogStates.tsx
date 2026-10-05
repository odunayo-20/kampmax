import Link from "next/link";
import { AlertCircle, SearchX } from "lucide-react";
import { BLOG_BASE_PATH } from "@/lib/blog";

export function BlogEmptyState({
  title = "No articles found",
  message,
  clearHref,
}: {
  title?: string;
  message: string;
  /** Offered when filters or a search produced the empty result. */
  clearHref?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-kampmax-border-strong bg-white px-6 py-14 text-center">
      <SearchX aria-hidden className="h-8 w-8 text-kampmax-text-muted" />
      <h2 className="mt-3 text-base font-semibold text-kampmax-text">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-kampmax-text-secondary">{message}</p>
      <Link
        href={clearHref ?? BLOG_BASE_PATH}
        className="mt-5 inline-flex h-10 items-center rounded-md border border-kampmax-border bg-white px-4 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted"
      >
        {clearHref ? "Clear search" : "Browse all articles"}
      </Link>
    </div>
  );
}

export function BlogErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <AlertCircle aria-hidden className="h-9 w-9 text-kampmax-error" />
      <h1 className="mt-3 text-lg font-semibold text-kampmax-text">We couldn&apos;t load the blog</h1>
      <p className="mt-1 text-sm text-kampmax-text-secondary">
        This is usually temporary. Check your connection and try again.
      </p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center rounded-md bg-kampmax-navy px-4 text-sm font-semibold text-white hover:bg-kampmax-navy-light"
        >
          Try again
        </button>
        <Link
          href="/home"
          className="inline-flex h-10 items-center rounded-md border border-kampmax-border bg-white px-4 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted"
        >
          Go to Kampmax
        </Link>
      </div>
    </div>
  );
}

export function BlogListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading articles" className="space-y-10">
      <div className="h-8 w-2/3 max-w-md animate-pulse rounded bg-kampmax-muted" />
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="space-y-3">
            <div className="aspect-[16/10] animate-pulse rounded-lg bg-kampmax-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-kampmax-muted" />
            <div className="h-5 w-full animate-pulse rounded bg-kampmax-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-kampmax-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
