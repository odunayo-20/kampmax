"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { confirmBookingCompletion } from "@/services/booking";
import type { BookingError, ServiceBooking } from "@/types/booking";

/** Customer: confirm a completed service. Opens the review window and starts
 * the settlement readiness display. */
export function ConfirmCompletionModal({
  booking,
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
  onClose: () => void;
  onComplete: (updated: ServiceBooking) => void;
}) {
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
    const result = await confirmBookingCompletion(booking.id);
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
      aria-labelledby="confirm-completion-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-success-600" />
            <h2 id="confirm-completion-title" className="text-sm font-bold text-neutral-900">
              Confirm completion
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
          <p className="text-xs text-neutral-600">
            <strong>{booking.serviceName}</strong> — confirm that the service was completed as
            booked. Confirming also opens your review window for this booking.
          </p>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
            >
              <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error.message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Not yet
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors",
                busy ? "cursor-wait bg-success-400" : "bg-success-600 hover:bg-success-700"
              )}
            >
              {busy ? "Confirming…" : "It&apos;s done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}