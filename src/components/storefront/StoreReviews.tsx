"use client";

import { Star } from "lucide-react";
import type { Storefront } from "@/types/storefront";
import { useTargetReviewSummary, useTargetReviews } from "@/hooks/use-target-reviews";
import { ReviewList } from "@/components/reviews/ReviewList";
import { StoreEmptyState } from "./StoreEmptyState";

interface StoreReviewsProps {
  store: Storefront;
}

/** Customer store reviews: summary breakdown + list with filtering. */
export function StoreReviews({ store }: StoreReviewsProps) {
  const reviewsQuery = useTargetReviews("vendor", store.vendorId);
  const summaryQuery = useTargetReviewSummary("vendor", store.vendorId);

  if (reviewsQuery.isPending || summaryQuery.isPending) {
    return <div className="h-40 animate-pulse rounded-xl bg-neutral-100" aria-hidden />;
  }

  if (reviewsQuery.isError || summaryQuery.isError) {
    return (
      <StoreEmptyState
        icon={<Star />}
        title="Couldn't load reviews"
        description="Please try again in a moment."
      />
    );
  }

  const reviews = reviewsQuery.data ?? [];
  if (reviews.length === 0) {
    return (
      <StoreEmptyState
        icon={<Star />}
        title="No reviews yet"
        description={`${store.storeName} hasn't received any reviews yet.`}
      />
    );
  }

  return (
    <div>
      <ReviewList reviews={reviews} summary={summaryQuery.data} />
    </div>
  );
}
