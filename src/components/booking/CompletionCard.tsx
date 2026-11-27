"use client";

import {
  AlertTriangle,
  BadgeCheck,
  MessageSquarePlus,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CUSTOMER_CONFIRMATION_BODY, CUSTOMER_CONFIRMATION_HEADING } from "@/config/service-order";
import { formatBookingDate } from "@/services/booking";
import type { ServiceBooking } from "@/types/booking";

/**
 * Customer post-completion gate. Renders only for orders that need (or got)
 * customer action: awaiting confirmation, confirmed, or problem reported.
 */
export function CompletionCard({
  booking,
  canReview,
  onConfirm,
  onReport,
  onReview,
}: {
  booking: ServiceBooking;
  canReview: boolean;
  onConfirm: () => void;
  onReport: () => void;
  onReview: () => void;
}) {
  const f = booking.fulfillment;
  if (f.confirmationStatus === "not_required") return null;

  if (f.confirmationStatus === "awaiting") {
    return (
      <div className="rounded-xl border border-info-200 bg-info-50 p-3.5">
        <p className="text-xs font-bold text-info-800">{CUSTOMER_CONFIRMATION_HEADING}</p>
        <p className="mt-1 text-xs leading-relaxed text-info-700">{CUSTOMER_CONFIRMATION_BODY}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3 py-2 text-xs font-bold text-white hover:bg-success-700"
          >
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> Confirm it was done
          </button>
          <button
            onClick={onReport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-xs font-bold text-error-700 hover:bg-error-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Report a problem
          </button>
        </div>
      </div>
    );
  }

  if (f.confirmationStatus === "problem_reported") {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-error-800">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Issue reported
        </p>
        <p className="mt-1 text-xs leading-relaxed text-error-700">
          {f.problem?.description ?? "Your issue was reported."} Kampmax support is looking into it. The payment
          stays on hold until then.
        </p>
      </div>
    );
  }

  if (f.confirmationStatus === "confirmed") {
    const confirmedLabel = f.customerConfirmedAt
      ? `Confirmed complete on ${formatBookingDate(f.customerConfirmedAt)}`
      : "Confirmed complete";
    return (
      <div
        className={cn(
          "rounded-xl border p-3.5",
          canReview ? "border-success-200 bg-success-50" : "border-neutral-200 bg-white"
        )}
      >
        <p className="flex items-center gap-1.5 text-xs font-bold text-success-700">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {confirmedLabel}
        </p>
        {f.review ? (
          <div className="mt-1.5 text-xs text-neutral-600">
            <p>
              Your review: {f.review.rating} of 5{f.review.title ? ` · ${f.review.title}` : ""}
            </p>
            {f.review.body && <p className="mt-1">{f.review.body}</p>}
          </div>
        ) : canReview ? (
          <>
            <p className="mt-1 text-xs leading-relaxed text-success-800">
              You can now review {booking.serviceName}.
            </p>
            <button
              onClick={onReview}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 hover:bg-primary-100"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden /> Leave a review
            </button>
          </>
        ) : (
          <p className="mt-1 text-xs text-neutral-500">
            The time to review this booking has passed.
          </p>
        )}
      </div>
    );
  }

  return null;
}