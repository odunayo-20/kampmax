"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle, Ban, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { cancelBooking } from "@/services/booking";
import type { BookingError, ServiceBooking } from "@/types/booking";

export function CancelBookingModal({
  booking,
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
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
      cancelledBy: "customer",
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
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Cancellation & Refund Policy</span>
            </p>
            <p>
              {booking.serviceName} · <strong>Full refund</strong> to your Kampmax wallet. You can cancel for free up to ${booking.cancellationPolicy.freeUntilHours} hours before the appointment.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error.message}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Select Reason for Cancellation
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 text-xs border border-neutral-200 rounded-xl bg-white focus:outline-none focus:border-error-500"
            >
              <option value="">Select a reason</option>
              <option value="Schedule conflict / Class time clash">Schedule conflict / Class time clash</option>
              <option value="Found alternative service provider">Found alternative service provider</option>
              <option value="Service no longer needed">Service no longer needed</option>
              <option value="Provider unresponsive">Provider unresponsive</option>
              <option value="Other">Other</option>
            </select>
          </div>

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