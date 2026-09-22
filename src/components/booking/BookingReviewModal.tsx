"use client";

import { useState } from "react";
import { Star, X, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";

interface BookingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  providerName: string;
  onSubmitReview: (rating: number, comment: string) => void;
}

export function BookingReviewModal({
  isOpen,
  onClose,
  serviceTitle,
  providerName,
  onSubmitReview,
}: BookingReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      onSubmitReview(rating, comment);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1200);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-kampmax-text">Rate & Review Service</h3>
            <p className="text-xs text-kampmax-text-secondary mt-0.5">
              {serviceTitle} by {providerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-kampmax-muted text-kampmax-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-sm font-bold text-kampmax-text">Thank You for Your Feedback!</h4>
            <p className="text-xs text-kampmax-text-secondary">
              Your review helps other students on Kampmax find great service providers.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star Rating selection */}
            <div>
              <label className="text-xs font-semibold text-kampmax-text block mb-2 text-center">
                How was your service experience?
              </label>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-center font-medium text-amber-600 mt-1">
                {rating === 5 && "Excellent! ⭐⭐⭐⭐⭐"}
                {rating === 4 && "Very Good! ⭐⭐⭐⭐"}
                {rating === 3 && "Average ⭐⭐⭐"}
                {rating === 2 && "Fair ⭐⭐"}
                {rating === 1 && "Poor ⭐"}
              </p>
            </div>

            {/* Written Review */}
            <div>
              <label className="text-xs font-semibold text-kampmax-text block mb-1">
                Your Review / Feedback
              </label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Was the service delivered on time? How was communication?"
                className="w-full p-3 text-xs border border-kampmax-border rounded-xl bg-white focus:outline-none focus:border-kampmax-blue"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="flex-1 bg-kampmax-navy text-white text-xs font-bold hover:bg-kampmax-navy/90"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit Review"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
