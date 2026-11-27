"use client";

import { Star } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useServiceProviderReviewsSummary } from "@/hooks/use-service-provider-dashboard";
import { barShare, latestNote, REVIEWS_EMPTY } from "@/lib/provider-reviews";
import type { ServiceProviderReview } from "@/types/service-provider-dashboard";

/** Whole stars for one review's rating. */
function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-yellow-500" role="img" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-neutral-300">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

export default function ReviewsPage() {
  const q = useServiceProviderReviewsSummary();
  const summary = q.data;

  if (q.isPending) {
    return <p className="py-10 text-center text-sm text-kampmax-text-secondary">Loading your reviews…</p>;
  }
  if (!summary) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        We couldn&apos;t load your reviews.{" "}
        <button type="button" onClick={() => void q.refetch()} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }
  const note = latestNote(summary.totalCount, summary.recent.length);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-kampmax-text">Reviews</h1>

      {summary.totalCount === 0 ? (
        <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-12 text-center">
          <p className="text-sm font-bold text-neutral-700">{REVIEWS_EMPTY.title}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-kampmax-text-secondary">{REVIEWS_EMPTY.text}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-kampmax-border bg-white p-5">
            {/* The average is a number, not stars: a whole-star row would turn 4.5 into 5. */}
            <p className="text-4xl font-bold text-kampmax-text">
              {summary.averageRating === null ? "—" : summary.averageRating.toFixed(1)}
              <span className="ml-1 text-sm font-medium text-kampmax-text-muted">out of 5</span>
            </p>
            <p className="mt-0.5 text-xs text-kampmax-text-muted">
              {summary.totalCount} review{summary.totalCount !== 1 ? "s" : ""}
            </p>
            <div className="mt-4 space-y-1.5">
              {summary.distribution.map((d) => (
                <div key={d.stars} className="flex items-center gap-2 text-xs text-kampmax-text-secondary">
                  <span className="w-4 text-right font-medium">{d.stars}</span>
                  <Star className="h-3.5 w-3.5 text-yellow-400" aria-hidden />
                  <div className="h-1.5 flex-1 rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-yellow-400"
                      style={{ width: `${barShare(d.count, summary.totalCount)}%` }}
                    />
                  </div>
                  <span className="w-6 text-kampmax-text-muted">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="divide-y divide-kampmax-border overflow-hidden rounded-xl border border-kampmax-border bg-white">
              {summary.recent.map((review) => (
                <ReviewRow key={review.id} review={review} />
              ))}
            </div>
            {note && <p className="mt-2 text-xs text-kampmax-text-muted">{note}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ review }: { review: ServiceProviderReview }) {
  return (
    <div className="p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-bold text-kampmax-text">{review.authorName}</span>
        <span className="text-xs text-kampmax-text-muted">{timeAgo(review.createdAt)}</span>
      </div>
      <div className="mt-0.5">
        <ReviewStars rating={review.rating} />
      </div>
      {review.title && <p className="mt-1.5 text-sm font-semibold text-kampmax-text">{review.title}</p>}
      {review.comment && <p className="mt-1 text-sm text-kampmax-text-secondary">{review.comment}</p>}
      <p className="mt-1 text-xs text-kampmax-text-muted">Service: {review.serviceName}</p>
    </div>
  );
}
