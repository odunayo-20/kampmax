"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Flag,
  ChevronDown,
  Store,
} from "lucide-react";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReportReviewModal } from "@/components/reviews/ReportReviewModal";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewImageGallery } from "@/components/reviews/ReviewImageGallery";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import {
  reviewedKey,
  useMyReviewedTargets,
  useReportPublicReview,
  useTargetReviewSummary,
  useTargetReviews,
} from "@/hooks/use-target-reviews";
import type { Review, ReviewSortOption } from "@/types";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface ProductReviewsSectionProps {
  /** Product UUID — used to fetch product-level reviews */
  productId: string;
  /** Vendor UUID — used to fetch vendor-level reviews & check vendor orders */
  vendorId: string;
  /** Current user ID (null if unauthenticated) */
  userId: string | null;
  /** Whether the current user has a completed purchase of this product */
  isVerifiedBuyer: boolean;
  /** Product title (shown in ReviewForm header) */
  productTitle?: string;
  /** Optional orderId to attach to the review */
  orderId?: string;
}

type TabValue = "product" | "store";
type SortOption = "recent" | "highest" | "lowest";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Most Recent",
  highest: "Highest Rated",
  lowest: "Lowest Rated",
};

const PAGE_SIZE = 5;

// ────────────────────────────────────────────────────────────────────────────
// Rating Bar (single star breakdown row)
// ────────────────────────────────────────────────────────────────────────────

function RatingBar({
  star,
  count,
  total,
  active,
  onClick,
}: {
  star: number;
  count: number;
  total: number;
  active: boolean;
  onClick: () => void;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-kampmax-muted",
        active && "bg-kampmax-blue/5 ring-1 ring-kampmax-blue/20"
      )}
    >
      <span className="w-3 shrink-0 text-right font-medium text-kampmax-text">{star}</span>
      <Star className="h-3 w-3 shrink-0 fill-kampmax-gold text-kampmax-gold" />
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-kampmax-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-kampmax-gold transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-kampmax-text-secondary">{count}</span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Review Card
// ────────────────────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  userId,
  onReport,
}: {
  review: Review;
  userId: string | null;
  onReport: (reviewId: string) => void;
}) {
  const displayName = review.authorName || "Customer";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <article className="rounded-xl border border-kampmax-border bg-white p-4 transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kampmax-blue/20 to-kampmax-blue/5 text-xs font-bold text-kampmax-blue">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-kampmax-text">
                {displayName}
              </span>
              {review.verifiedPurchase && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-600">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Verified Purchase
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-[10px] text-kampmax-text-secondary">{timeAgo(review.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review title + body */}
      {review.title && (
        <p className="mt-2.5 text-sm font-semibold text-kampmax-text">{review.title}</p>
      )}
      <p className="mt-1 text-sm leading-relaxed text-kampmax-text-secondary">{review.comment}</p>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <ReviewImageGallery images={review.images} />
      )}

      {/* Vendor reply */}
      {review.vendorResponse && (
        <div className="mt-3 rounded-xl border border-kampmax-blue/15 bg-gradient-to-r from-kampmax-blue/5 to-transparent p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-kampmax-blue" aria-hidden />
            <span className="text-xs font-semibold text-kampmax-blue">Seller Response</span>
            <span className="text-[10px] text-kampmax-text-secondary">
              {timeAgo(review.vendorResponse.createdAt)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-kampmax-text-secondary">
            {review.vendorResponse.text}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-3">
        {userId && review.userId !== userId && (
          <button
            type="button"
            onClick={() => onReport(review.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-error"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden />
            Report
          </button>
        )}
      </div>
    </article>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

export function ProductReviewsSection({
  productId,
  vendorId,
  userId,
  isVerifiedBuyer,
  productTitle,
  orderId,
}: ProductReviewsSectionProps) {
  const [tab, setTab] = useState<TabValue>("product");
  const [sort, setSort] = useState<SortOption>("recent");
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [writeOpen, setWriteOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [sortOpen, setSortOpen] = useState(false);

  // ── Data (live API) ─────────────────────────────────────────────────────
  const kind = tab === "product" ? "product" : "vendor";
  const targetId = tab === "product" ? productId : vendorId;
  const reviewsQuery = useTargetReviews(kind, targetId);
  const summaryQuery = useTargetReviewSummary(kind, targetId);
  const myReviewed = useMyReviewedTargets();
  const reportMutation = useReportPublicReview();

  const rawReviews = reviewsQuery.data ?? [];
  const summary = summaryQuery.data ?? {
    averageRating: 0,
    totalReviews: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    recommendPercentage: 0,
  };

  const alreadyReviewed = userId
    ? Boolean(myReviewed.data?.has(reviewedKey(kind, targetId)))
    : false;

  // ── Filter + sort ────────────────────────────────────────────────────────
  let filtered = starFilter ? rawReviews.filter((r) => r.rating === starFilter) : rawReviews;
  const sortFns: Record<SortOption, (a: Review, b: Review) => number> = {
    recent: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    highest: (a, b) => b.rating - a.rating,
    lowest: (a, b) => a.rating - b.rating,
  };
  filtered = [...filtered].sort(sortFns[sort] ?? sortFns.recent);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page on filter/sort/tab change
  useEffect(() => { setPage(1); }, [tab, sort, starFilter, tick]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleReport = useCallback((reviewId: string) => {
    setReportTarget(reviewId);
  }, []);

  const handleReportSubmit = useCallback(async (reason: string, details?: string) => {
    if (!reportTarget || !userId) return;
    try {
      await reportMutation.mutateAsync({ reviewId: reportTarget, reason, details });
    } finally {
      setReportTarget(null);
      setTick((t) => t + 1);
    }
  }, [reportTarget, userId, reportMutation]);

  // ── Write review button logic ─────────────────────────────────────────
  const canWriteReview = userId && isVerifiedBuyer && !alreadyReviewed;
  const writeButtonLabel = !userId
    ? "Sign in to review"
    : !isVerifiedBuyer
    ? "Purchase to review"
    : alreadyReviewed
    ? "Already reviewed"
    : "Write a Review";

  const breakdown = summary.breakdown as Record<number, number>;

  return (
    <section className="space-y-5" aria-label="Product reviews">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-kampmax-text">
          Reviews & Ratings
        </h2>
        <button
          type="button"
          disabled={!canWriteReview}
          onClick={() => canWriteReview && setWriteOpen(true)}
          title={canWriteReview ? "Write a review" : writeButtonLabel}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
            canWriteReview
              ? "bg-kampmax-blue text-white shadow-sm hover:bg-kampmax-blue-dark hover:shadow-md"
              : "cursor-not-allowed bg-kampmax-muted text-kampmax-text-secondary"
          )}
        >
          {writeButtonLabel}
        </button>
      </div>

      {/* ── Summary card ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-kampmax-border bg-white p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Big average */}
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-5xl font-black tracking-tight text-kampmax-text">
              {summary.averageRating.toFixed(1)}
            </span>
            <StarRating rating={Math.round(summary.averageRating)} size="md" />
            <span className="mt-1 text-xs text-kampmax-text-secondary">
              {summary.totalReviews} review{summary.totalReviews !== 1 ? "s" : ""}
            </span>
            {summary.totalReviews > 0 && (
              <span className="mt-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-600">
                {Math.round((((breakdown[4] ?? 0) + (breakdown[5] ?? 0)) / summary.totalReviews) * 100)}% recommend
              </span>
            )}
          </div>

          {/* Rating bars */}
          <div className="flex-1 space-y-1">
            {([5, 4, 3, 2, 1] as const).map((s) => (
              <RatingBar
                key={s}
                star={s}
                count={breakdown[s] ?? 0}
                total={summary.totalReviews}
                active={starFilter === s}
                onClick={() => setStarFilter(starFilter === s ? null : s)}
              />
            ))}
            {starFilter && (
              <button
                type="button"
                onClick={() => setStarFilter(null)}
                className="mt-1 text-[11px] font-medium text-kampmax-blue underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl border border-kampmax-border bg-kampmax-muted p-1">
        {(["product", "store"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setStarFilter(null); }}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
              tab === t
                ? "bg-white text-kampmax-text shadow-sm"
                : "text-kampmax-text-secondary hover:text-kampmax-text"
            )}
          >
            {t === "product" ? "Product Reviews" : "Store Reviews"}
          </button>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-kampmax-text-secondary">
          {filtered.length} review{filtered.length !== 1 ? "s" : ""}
          {starFilter ? ` with ${starFilter} star${starFilter !== 1 ? "s" : ""}` : ""}
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3 py-2 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted"
          >
            {SORT_LABELS[sort]}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", sortOpen && "rotate-180")} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[150px] rounded-xl border border-kampmax-border bg-white py-1 shadow-lg">
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSort(key); setSortOpen(false); setPage(1); }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs transition-colors hover:bg-kampmax-muted",
                    sort === key ? "font-semibold text-kampmax-blue" : "text-kampmax-text"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Review list ──────────────────────────────────────────────── */}
      {paged.length === 0 ? (
        <div className="rounded-xl border border-kampmax-border bg-white py-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary/40" aria-hidden />
          <p className="text-sm font-medium text-kampmax-text">No reviews yet</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              userId={userId}
              onReport={handleReport}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-kampmax-border px-3 py-2 text-xs font-medium disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-kampmax-text-secondary">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-kampmax-border px-3 py-2 text-xs font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Write Review Modal ───────────────────────────────────────── */}
      <ReviewForm
        isOpen={writeOpen}
        onClose={() => setWriteOpen(false)}
        targetId={tab === "product" ? productId : vendorId}
        target={tab === "product" ? "product" : "vendor"}
        vendorId={vendorId}
        productId={productId}
        orderId={orderId}
        onSuccess={() => setTick((t) => t + 1)}
      />

      {/* ── Report Modal ─────────────────────────────────────────────── */}
      <ReportReviewModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportSubmit}
      />
    </section>
  );
}
