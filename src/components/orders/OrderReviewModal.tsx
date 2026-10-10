"use client";

import { useState } from "react";
import { X, Send, Check, Star, Store, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/reviews/StarRating";
import { useSubmitReview, useMyReviewedTargets, reviewedKey } from "@/hooks/use-target-reviews";
import { useAuth } from "@/lib/auth-context";
import { Order } from "@/types";

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  vendorName?: string;
  initialTarget?: {
    type: "vendor" | "product";
    id: string;
    name?: string;
  };
  onSuccess?: (type: "vendor" | "product", id: string) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export function OrderReviewModal({
  isOpen,
  onClose,
  order,
  vendorName = "Vendor",
  initialTarget,
  onSuccess,
}: OrderReviewModalProps) {
  const { user } = useAuth();
  const { data: reviewedSet, refetch: refetchReviewed } = useMyReviewedTargets();
  const submitReview = useSubmitReview();

  // Selected target: either "vendor" with vendorId or "product" with productId
  const defaultTargetType = initialTarget?.type ?? "vendor";
  const defaultTargetId = initialTarget?.id ?? order.vendorId;

  const [targetType, setTargetType] = useState<"vendor" | "product">(defaultTargetType);
  const [targetId, setTargetId] = useState<string>(defaultTargetId);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentKey = reviewedKey(targetType, targetId);
  const isAlreadyReviewed = Boolean(reviewedSet?.has(currentKey));

  // Determine active target name
  const currentTargetName =
    targetType === "vendor"
      ? vendorName
      : order.items.find((i) => i.product.id === targetId)?.product.title || "Product";

  function handleSwitchTarget(type: "vendor" | "product", id: string) {
    setTargetType(type);
    setTargetId(id);
    setError(null);
    setSubmitted(false);
    setRating(5);
    setTitle("");
    setComment("");
  }

  async function handleSubmit() {
    if (!user) {
      setError("Please sign in to submit a review.");
      return;
    }
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    if (comment.trim().length < 10) {
      setError("Please write at least 10 characters for your review.");
      return;
    }

    setError(null);

    try {
      await submitReview.mutateAsync({
        kind: targetType,
        targetId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      setSubmitted(true);
      await refetchReviewed();
      onSuccess?.(targetType, targetId);

      setTimeout(() => {
        setSubmitted(false);
        setTitle("");
        setComment("");
        // If there are other unreviewed items, remain open or close
        onClose();
      }, 1600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit review.";
      setError(msg);
    }
  }

  const isValid = rating > 0 && comment.trim().length >= 10 && !isAlreadyReviewed;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-kampmax-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kampmax-border bg-slate-50/50">
          <div>
            <h2 id="review-modal-title" className="text-base font-bold text-kampmax-text">
              Customer Review
            </h2>
            <p className="text-xs text-kampmax-text-secondary mt-0.5">
              Order #{order.id} · Share your campus shopping experience
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-kampmax-text-secondary hover:bg-slate-100 transition-colors"
            aria-label="Close review modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Tabs (Store vs Products) */}
        <div className="px-5 pt-3 pb-2 border-b border-kampmax-border bg-white">
          <p className="text-xs font-semibold text-kampmax-text-secondary uppercase tracking-wider mb-2">
            Select what to review:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {/* Vendor tab */}
            {(() => {
              const vendorReviewed = Boolean(
                reviewedSet?.has(reviewedKey("vendor", order.vendorId))
              );
              const isActive = targetType === "vendor" && targetId === order.vendorId;
              return (
                <button
                  type="button"
                  onClick={() => handleSwitchTarget("vendor", order.vendorId)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    isActive
                      ? "bg-kampmax-navy text-white border-kampmax-navy shadow-xs"
                      : "bg-white text-kampmax-text border-kampmax-border hover:bg-slate-50"
                  )}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Store: {vendorName}</span>
                  {vendorReviewed && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full",
                        isActive ? "bg-white/20 text-white" : "bg-green-100 text-green-700 font-semibold"
                      )}
                    >
                      Reviewed
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Product items tabs */}
            {order.items.map((item) => {
              const prodReviewed = Boolean(
                reviewedSet?.has(reviewedKey("product", item.product.id))
              );
              const isActive = targetType === "product" && targetId === item.product.id;
              return (
                <button
                  key={item.product.id}
                  type="button"
                  onClick={() => handleSwitchTarget("product", item.product.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border max-w-[200px] truncate",
                    isActive
                      ? "bg-kampmax-navy text-white border-kampmax-navy shadow-xs"
                      : "bg-white text-kampmax-text border-kampmax-border hover:bg-slate-50"
                  )}
                >
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.product.title}</span>
                  {prodReviewed && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full shrink-0",
                        isActive ? "bg-white/20 text-white" : "bg-green-100 text-green-700 font-semibold"
                      )}
                    >
                      Reviewed
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-kampmax-success/10 flex items-center justify-center text-kampmax-success animate-in zoom-in-75">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-kampmax-text">Review Submitted!</h3>
            <p className="text-xs text-kampmax-text-secondary max-w-sm">
              Thank you for reviewing {currentTargetName}. Your rating helps students on campus make informed decisions.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isAlreadyReviewed && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-600 fill-amber-600 shrink-0" />
                <span>
                  You have already submitted a review for <strong>{currentTargetName}</strong>. You can choose another item from the order above.
                </span>
              </div>
            )}

            {/* Rating Stars */}
            <div className="flex flex-col items-center justify-center py-2 bg-slate-50/60 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-kampmax-text-secondary mb-2">
                Rate your experience with {targetType === "vendor" ? "this store" : "this item"}:
              </p>
              <StarRating
                rating={rating}
                size="lg"
                interactive={!isAlreadyReviewed}
                onChange={setRating}
              />
              <span className="text-xs font-bold text-kampmax-navy mt-1.5">
                {RATING_LABELS[rating] || "Select rating"}
              </span>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-medium text-kampmax-text-secondary mb-1">
                Headline / Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isAlreadyReviewed}
                placeholder="e.g., Fast delivery, great quality!"
                maxLength={80}
                className="w-full px-3 py-2 text-sm bg-white border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {/* Detailed Comment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-kampmax-text-secondary">
                  Detailed Review *
                </label>
                <span className="text-[10px] text-kampmax-text-secondary">
                  {comment.length}/500
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isAlreadyReviewed}
                placeholder="Write your review here. How was the item quality, delivery time, or vendor communication?"
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 text-sm bg-white border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue resize-none disabled:bg-slate-100 disabled:text-slate-400"
              />
              <div className="flex justify-between mt-0.5">
                <span
                  className={cn(
                    "text-[10px]",
                    comment.length > 0 && comment.length < 10
                      ? "text-kampmax-error font-medium"
                      : "text-kampmax-text-secondary"
                  )}
                >
                  {comment.length > 0 && comment.length < 10
                    ? `${10 - comment.length} more character(s) required`
                    : "Minimum 10 characters"}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!submitted && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-kampmax-border bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-kampmax-text border border-kampmax-border rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || submitReview.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all",
                isValid && !submitReview.isPending
                  ? "bg-kampmax-navy text-white hover:bg-kampmax-navy/90 shadow-sm"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <Send className="w-3.5 h-3.5" />
              {submitReview.isPending ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
