"use client";

import { useMemo, useState, use } from "react";
import { MessageSquare } from "lucide-react";
import { useVendorReviewSummary, useVendorReviews } from "@/hooks/use-vendor-reviews";
import { getDefaultVendorReviewPermissions } from "@/types/vendor-reviews";
import { ReviewsHeader } from "@/components/vendor-reviews/ReviewsHeader";
import { ReviewSummaryCard } from "@/components/vendor-reviews/ReviewSummaryCard";
import { ReviewsToolbar } from "@/components/vendor-reviews/ReviewsToolbar";
import { VendorReviewListItem } from "@/components/vendor-reviews/VendorReviewListItem";
import { VendorPagination } from "@/components/vendor-shared/VendorPagination";
import { ReviewsSkeleton } from "@/components/vendor-reviews/ReviewsSkeleton";
import type { VendorReviewScope, VendorReviewResponseFilter, VendorReviewRatingBand, VendorReviewSortField } from "@/types/vendor-reviews";

const PAGE_SIZE = 10;

export default function VendorReviewsPage({ params }: { params: Promise<{}> }) {
  use(params);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<VendorReviewScope>("all");
  const [responseStatus, setResponseStatus] = useState<VendorReviewResponseFilter>("all");
  const [ratingBand, setRatingBand] = useState<VendorReviewRatingBand>("all");
  const [star, setStar] = useState<number | null>(null);
  const [sort, setSort] = useState<VendorReviewSortField>("newest");

  const summaryQuery = useVendorReviewSummary();
  const reviewsQuery = useVendorReviews({
    search: search || undefined,
    scope,
    responseStatus,
    ratingBand,
    star: star ?? undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const counts = summaryQuery.data?.counts ?? { all: 0, answered: 0, unanswered: 0, withImages: 0, reported: 0 };
  const summary = summaryQuery.data?.summary ?? {
    averageRating: 0,
    totalReviews: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    recommendPercentage: 0,
  };
  const result = reviewsQuery.data;
  const permissions = useMemo(() => getDefaultVendorReviewPermissions(), []);

  // Mutations invalidate the vendor-reviews cache themselves.
  const refresh = () => {};

  const hasActiveFilters =
    search !== "" || scope !== "all" || responseStatus !== "all" || ratingBand !== "all" || star !== null;

  const clearFilters = () => {
    setSearch("");
    setScope("all");
    setResponseStatus("all");
    setRatingBand("all");
    setStar(null);
    setSort("newest");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <ReviewsHeader counts={counts} />

      <ReviewSummaryCard summary={summary} starFilter={star} onStarChange={(s) => { setStar(s); setPage(1); }} />

      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <ReviewsToolbar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          scope={scope}
          onScopeChange={(v) => { setScope(v); setPage(1); }}
          responseStatus={responseStatus}
          onResponseChange={(v) => { setResponseStatus(v); setPage(1); }}
          ratingBand={ratingBand}
          onRatingBandChange={(v) => { setRatingBand(v); setPage(1); }}
          sort={sort}
          onSortChange={(v) => { setSort(v); setPage(1); }}
          total={result?.total ?? 0}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />

        <div className="mt-4">
          {reviewsQuery.isPending ? (
            <ReviewsSkeleton />
          ) : reviewsQuery.isError || !result ? (
            <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
              <p className="text-sm font-medium text-error-700">Couldn&apos;t load your reviews.</p>
              <button type="button" onClick={() => reviewsQuery.refetch()} className="mt-2 text-xs font-semibold text-error-700 underline">
                Try again
              </button>
            </div>
          ) : result.items.length === 0 ? (
            <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
              <p className="text-sm font-medium text-kampmax-text">No reviews found</p>
              <p className="mt-1 text-xs text-kampmax-text-secondary">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.items.map((review) => (
                <VendorReviewListItem
                  key={review.id}
                  review={review}
                  productTitle={review.productTitle}
                  permissions={permissions}
                  onChanged={refresh}
                />
              ))}
            </div>
          )}
        </div>

        <VendorPagination
          page={result?.page ?? 1}
          totalPages={result?.totalPages ?? 1}
          total={result?.total ?? 0}
          pageSize={result?.pageSize ?? PAGE_SIZE}
          itemLabel="reviews"
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}