"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { acceptBooking, acceptProviderBookingLive } from "@/services/booking";
import type { BookingError, ServiceBooking } from "@/types/booking";

export function AcceptBookingModal({
  booking,
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
  onClose: () => void;
  onComplete: (updated: ServiceBooking) => void;
}) {
  const isRange = booking.price.model === "range";
  const [amount, setAmount] = useState(
    isRange ? String(booking.price.amount) : ""
  );
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
    const parsed = Number(amount);
    if (isRange && (!Number.isFinite(parsed) || parsed <= 0)) {
      setError({ code: "422", message: "Enter a valid final amount in naira." });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const liveRes = await acceptProviderBookingLive(booking.id, isRange ? parsed : undefined);
      if (liveRes.ok) {
        acceptBooking({
          id: booking.id,
          finalFee: isRange ? parsed : undefined,
        });
        setBusy(false);
        onComplete(liveRes.booking);
        return;
      }
    } catch {
      // Fallback
    }
    const result = acceptBooking({
      id: booking.id,
      finalFee: isRange ? parsed : undefined,
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
      aria-labelledby="accept-booking-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success-600" />
            <h2 id="accept-booking-title" className="text-sm font-bold text-neutral-900">
              Confirm booking request
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
            <strong>{booking.serviceName}</strong> · {booking.customer.name} ·{" "}
            <span className="font-mono font-semibold">{booking.bookingReference}</span>
          </p>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error.message}
            </p>
          )}

          {isRange ? (
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                Final price in naira (₦)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(booking.price.amount)}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-success-400 focus:outline-none"
              />
              <span className="mt-1 block text-[11px] text-neutral-400">
                Quote range was ₦{booking.price.amount.toLocaleString("en-NG")}–
                {booking.price.amountMax?.toLocaleString("en-NG")}. This locks the amount the
                customer pays later.
              </span>
            </label>
          ) : null}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors",
                busy ? "cursor-wait bg-success-400" : "bg-success-600 hover:bg-success-700"
              )}
            >
              {busy ? "Confirming…" : "Accept booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}