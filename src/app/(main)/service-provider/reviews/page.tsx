"use client";
 
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { fetchSpReviewsSummaryLive } from "@/services/service-provider-dashboard";
import type { ServiceProviderReviewsSummary, ServiceProviderReview } from "@/types/service-provider-dashboard";

export default function ReviewsPage() {
  const [summary, setSummary] = useState<ServiceProviderReviewsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchSpReviewsSummaryLive()
      .then((live) => {
        if (!cancelled) setSummary(live);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loading && !summary) {
    return <p className="py-10 text-center text-sm text-kampmax-text-secondary">Loading your reviews…</p>;
  }
  if (!summary) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        {failed ? "We couldn't load your reviews." : "Reviews aren't available right now."}{" "}
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }
  const average = summary.averageRating;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text">Reviews</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Customer feedback on completed bookings. Reviews appear here once Kampmax has approved them.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Summary */}
        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-kampmax-text">{average === null ? "—" : average.toFixed(1)}</span>
            <div>
              <div className="text-yellow-500" aria-label={`${average ?? 0} out of 5 stars`}>
                {"★★★★★".slice(0, Math.round(average ?? 0))}
                <span className="text-neutral-300">{"★★★★★".slice(Math.round(average ?? 0))}</span>
              </div>
              <p className="text-xs text-kampmax-text-muted">{summary.totalCount} review{summary.totalCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {summary.distribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-2 text-xs text-kampmax-text-secondary">
                <span className="w-4 text-right font-medium">{d.stars}</span>
                <Star className="h-3.5 w-3.5 text-yellow-400" aria-hidden />
                <div className="flex-1 h-1.5 rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-yellow-400"
                    style={{ width: `${summary.totalCount ? (d.count / summary.totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-kampmax-text-muted">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reviews */}
        <div className="lg:col-span-2">
          {summary.recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-12 text-center text-sm text-kampmax-text-secondary">
              No reviews yet.
            </div>
          ) : (
            <div className="divide-y divide-kampmax-border overflow-hidden rounded-xl border border-kampmax-border bg-white">
              {summary.recent.map((review) => (
                <ReviewRow key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ review }: { review: ServiceProviderReview }) {
  return (
    <div className="flex items-start gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
        {review.authorName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-bold text-kampmax-text">{review.authorName}</span>
          <span className="text-xs text-kampmax-text-muted">{timeAgo(review.createdAt)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-sm text-yellow-500">
          {"★★★★★".slice(0, Math.round(review.rating))}
          <span className="text-neutral-300">{"★★★★★".slice(Math.round(review.rating))}</span>
        </div>
        <p className="mt-1.5 text-sm text-kampmax-text-secondary">{review.comment}</p>
        <p className="mt-1 text-xs text-kampmax-text-muted">Service: {review.serviceName}</p>
        {!review.visible && (
          <span className="mt-2 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200">
            Hidden from public profile
          </span>
        )}
      </div>
    </div>
  );
}