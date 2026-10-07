"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { declineBooking } from "@/services/booking";
import type { BookingError, ServiceBooking } from "@/types/booking";

const REASONS = [
  "No longer available at that time",
  "Scheduling conflict",
  "Need more information",
  "Service not available in that location",
  "Other",
];

export function DeclineBookingModal({
  booking,
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
  onClose: () => void;
  onComplete: (updated: ServiceBooking) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
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
    if (!reason) {
      setError({ code: "422", message: "Choose a reason so the customer knows why." });
      return;
    }
    const finalReason = reason === "Other" ? note.trim() || "Other" : reason;
    setBusy(true);
    setError(null);
    const result = await declineBooking(booking.id, finalReason);
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
      aria-labelledby="decline-booking-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-error-600" />
            <h2 id="decline-booking-title" className="text-sm font-bold text-neutral-900">
              Decline this booking
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

          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Reason *</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-error-400 focus:outline-none"
            >
              <option value="">Select a reason…</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-neutral-600">
              Note to customer (optional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. I'm fully booked that day, but another slot would work."
              className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-error-400 focus:outline-none"
            />
          </label>

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
                busy ? "cursor-wait bg-error-400" : "bg-error-600 hover:bg-error-700"
              )}
            >
              {busy ? "Declining…" : "Decline booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}