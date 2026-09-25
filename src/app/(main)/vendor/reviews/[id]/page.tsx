"use client";

import { useMemo, use } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquareX } from "lucide-react";
import { useVendorReview } from "@/hooks/use-vendor-reviews";
import { getDefaultVendorReviewPermissions } from "@/types/vendor-reviews";
import { VendorReviewListItem } from "@/components/vendor-reviews/VendorReviewListItem";
import { ReviewsSkeleton } from "@/components/vendor-reviews/ReviewsSkeleton";

export default function VendorReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const reviewQuery = useVendorReview(id);
  const permissions = useMemo(() => getDefaultVendorReviewPermissions(), []);

  if (reviewQuery.isPending) return <ReviewsSkeleton />;

  const review = reviewQuery.data;
  if (reviewQuery.isError || !review) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
        <MessageSquareX className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
        <p className="text-sm font-medium text-kampmax-text">Review not found</p>
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          This review may not belong to your store.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/vendor/reviews"
        className="inline-flex items-center gap-1 text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-blue"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to reviews
      </Link>

      <VendorReviewListItem
        review={review}
        productTitle={review.productTitle}
        permissions={permissions}
        onChanged={() => {}}
      />

      <p className="px-1 text-xs text-kampmax-text-secondary">
        Tip: reply to unanswered reviews to show customers you care. You can edit or delete your response at any time.
      </p>
    </div>
  );
}