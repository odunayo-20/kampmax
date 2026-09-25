"use client";

import { useState } from "react";
import Image from "next/image";
import { Review, ReviewReportReason } from "@/types";
import { useReportPublicReview } from "@/hooks/use-target-reviews";
import { useAuth } from "@/lib/auth-context";
import { StarRating } from "./StarRating";
import { ReviewImageGallery } from "./ReviewImageGallery";
import { ReportReviewModal } from "./ReportReviewModal";
import { cn, timeAgo } from "@/lib/utils";
import { ShieldCheck, MoreHorizontal, Flag } from "lucide-react";

interface ReviewCardProps {
  review: Review;
  onRefresh?: () => void;
}

export function ReviewCard({ review, onRefresh }: ReviewCardProps) {
  const { user } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const authorName = review.authorName;
  const reportMutation = useReportPublicReview();
  const isReported = reportMutation.isSuccess || Boolean(review.reportedBy?.length);

  async function handleReport(reason: ReviewReportReason, details: string) {
    if (!user) return;
    try {
      await reportMutation.mutateAsync({ reviewId: review.id, reason, details });
      onRefresh?.();
    } catch {
      // The modal stays usable; the review is simply not reported.
    }
  }

  return (
    <>
      <div className="py-4 border-b border-kampmax-border last:border-b-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-kampmax-blue/10 flex items-center justify-center text-xs font-bold text-kampmax-blue">
              {authorName ? authorName.charAt(0) : "?"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-kampmax-text">
                  {authorName || "Customer"}
                </span>
                {review.verifiedPurchase && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-kampmax-blue bg-kampmax-blue/5 px-1.5 py-0.5 rounded">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={review.rating} size="sm" />
                <span className="text-[10px] text-kampmax-text-secondary">
                  {timeAgo(review.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-kampmax-text-secondary hover:bg-kampmax-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white border border-kampmax-border rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReport(true);
                    }}
                    disabled={isReported}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs flex items-center gap-2",
                      isReported
                        ? "text-kampmax-text-secondary/50 cursor-not-allowed"
                        : "text-kampmax-error hover:bg-kampmax-muted"
                    )}
                  >
                    <Flag className="h-3 w-3" />
                    {isReported ? "Reported" : "Report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {review.title && (
          <p className="text-sm font-semibold text-kampmax-text mt-2.5">{review.title}</p>
        )}

        <p className="text-sm text-kampmax-text-secondary leading-relaxed mt-1.5">
          {review.comment}
        </p>

        {review.images && review.images.length > 0 && (
          <ReviewImageGallery images={review.images} />
        )}

        {review.vendorResponse && (
          <div className="mt-3 bg-kampmax-blue/5 rounded-lg p-3 border border-kampmax-blue/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-semibold text-kampmax-blue">Vendor Reply</span>
              <span className="text-[10px] text-kampmax-text-secondary">
                {timeAgo(review.vendorResponse.createdAt)}
              </span>
            </div>
            <p className="text-xs text-kampmax-text-secondary leading-relaxed">
              {review.vendorResponse.text}
            </p>
          </div>
        )}

      </div>

      <ReportReviewModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={handleReport}
      />
    </>
  );
}
