"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitBookingReview } from "@/services/booking";
import type { BookingError, ServiceBooking } from "@/types/booking";

/** Customer: leave a review on a confirmed-complete booking. */
export function LeaveReviewModal({
  booking,
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
  onClose: () => void;
  onComplete: (updated: ServiceBooking) => void;
}) {
  const [rating, setRating] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<BookingError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function submit() {
    if (busy || rating < 1) return;
    setBusy(true);
    setError(null);
    const result = await submitBookingReview(booking.id, {
      rating: rating as 1 | 2 | 3 | 4 | 5,
      title: title.trim() || undefined,
      body: body.trim() || undefined,
    });
    setBusy(false);
    if (result.ok) {
      onComplete(result.booking);
    } else {
      setError(result.error);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-review-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary-600" />
            <h2 id="leave-review-title" className="text-sm font-bold text-neutral-900">
              Review {booking.serviceName}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
            >
              <MessageSquarePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error.message}
            </p>
          )}

          <fieldset>
            <legend className="text-xs font-medium text-neutral-600">Your rating</legend>
            <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n !== 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  className="rounded-md p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      n <= rating ? "fill-yellow-400 text-yellow-500" : "text-neutral-300"
                    )}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Title (optional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fast and professional"
              className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-neutral-600">What was it like?</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Share your experience with this provider..."
              className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || rating < 1}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors",
                busy || rating < 1
                  ? "cursor-not-allowed bg-primary-300"
                  : "bg-primary-600 hover:bg-primary-700"
              )}
            >
              {busy ? "Submitting…" : "Submit review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}