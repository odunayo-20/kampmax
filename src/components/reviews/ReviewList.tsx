"use client";

import { useState, useMemo } from "react";
import { Review, ReviewSortOption, ReviewSummary } from "@/types";
import { sortReviews } from "@/services/reviews";
import { StarRating } from "./StarRating";
import { RatingBreakdown } from "./RatingBreakdown";
import { ReviewCard } from "./ReviewCard";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, X } from "lucide-react";

interface ReviewListProps {
  reviews: Review[];
  summary: ReviewSummary;
  showBreakdown?: boolean;
  onRefresh?: () => void;
}

const sortOptions: { value: ReviewSortOption; label: string }[] = [
  { value: "recent", label: "Most Recent" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
];

export function ReviewList({
  reviews,
  summary,
  showBreakdown = true,
  onRefresh,
}: ReviewListProps) {
  const [sort, setSort] = useState<ReviewSortOption>("recent");
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...reviews];
    if (filterStar !== null) {
      result = result.filter((r) => r.rating === filterStar);
    }
    return sortReviews(result, sort);
  }, [reviews, sort, filterStar]);

  return (
    <div className="space-y-4">
      {showBreakdown && <RatingBreakdown summary={summary} />}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-kampmax-text">
          {filtered.length} Review{filtered.length !== 1 ? "s" : ""}
          {filterStar !== null && (
            <span className="text-kampmax-blue ml-1">
              ({filterStar} star{filterStar !== 1 ? "s" : ""})
            </span>
          )}
        </p>

        <div className="flex items-center gap-2">
          {filterStar !== null && (
            <button
              onClick={() => setFilterStar(null)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-kampmax-blue/10 text-kampmax-blue text-xs font-medium"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
              showFilters || filterStar !== null
                ? "border-kampmax-blue bg-kampmax-blue/5 text-kampmax-blue"
                : "border-kampmax-border text-kampmax-text-secondary hover:bg-kampmax-muted"
            )}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filter
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  sort === opt.value
                    ? "bg-kampmax-navy text-white"
                    : "bg-kampmax-muted text-kampmax-text-secondary hover:bg-kampmax-muted/80"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-kampmax-text-secondary">Rating:</span>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                onClick={() => setFilterStar(filterStar === star ? null : star)}
                className={cn(
                  "flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors",
                  filterStar === star
                    ? "border-kampmax-gold bg-kampmax-gold/10 text-kampmax-gold"
                    : "border-kampmax-border text-kampmax-text-secondary hover:bg-kampmax-muted"
                )}
              >
                {star}
                <Star
                  className="h-3 w-3 fill-current"
                  style={{ color: "var(--color-kampmax-gold)" }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-kampmax-text-secondary">
              {filterStar !== null
                ? `No ${filterStar}-star reviews yet`
                : "No reviews yet"}
            </p>
          </div>
        ) : (
          filtered.map((review) => (
            <ReviewCard key={review.id} review={review} onRefresh={onRefresh} />
          ))
        )}
      </div>
    </div>
  );
}

function Star(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
