"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle, Ban, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeBookingActionError } from "@/lib/my-bookings-list";
import { cancelBooking } from "@/services/booking";
import type { BookingError, ServiceBooking } from "@/types/booking";

/** Cancelling from either side. The customer is always refunded in full. */
export function CancelBookingModal({
  booking,
  by = "customer",
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
  by?: "customer" | "provider";
  onClose: () => void;
  onComplete: (updated: ServiceBooking) => void;
}) {
  const [reason, setReason] = useState("");
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
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await cancelBooking({
      id: booking.id,
      reason: reason.trim() || undefined,
      cancelledBy: by,
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
      aria-labelledby="cancel-booking-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-error-600" />
            <h2 id="cancel-booking-title" className="text-sm font-bold text-neutral-900">
              Cancel this booking
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
          <p className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
            {by === "provider"
              ? `${booking.customer.name} is refunded in full and told you cancelled.`
              : `Full refund to your wallet. You can cancel for free up to ${booking.cancellationPolicy.freeUntilHours} hours before the appointment.`}
          </p>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {describeBookingActionError(error.code, error.message)}
            </p>
          )}

          {by === "provider" ? (
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">Why are you cancelling? (optional, the customer sees it)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-error-500 focus:outline-none"
              />
            </label>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">Reason for cancelling</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs focus:border-error-500 focus:outline-none"
              >
                <option value="">Select a reason</option>
                <option value="Schedule conflict / Class time clash">Schedule conflict / Class time clash</option>
                <option value="Found alternative service provider">Found alternative service provider</option>
                <option value="Service no longer needed">Service no longer needed</option>
                <option value="Provider unresponsive">Provider unresponsive</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Keep booking
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors",
                busy ? "cursor-wait bg-error-400" : "bg-error-600 hover:bg-error-700"
              )}
            >
              {busy ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}