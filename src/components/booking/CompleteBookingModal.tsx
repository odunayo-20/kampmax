"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { completeBooking } from "@/services/booking";
import { EvidenceUpload } from "./EvidenceUpload";
import type { BookingError, BookingEvidence, ServiceBooking } from "@/types/booking";

/** Provider: mark a booking completed. Optional evidence when the service
 * category allows it; the customer then confirms when the category requires. */
export function CompleteBookingModal({
  booking,
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
  onClose: () => void;
  onComplete: (updated: ServiceBooking) => void;
}) {
  const [evidence, setEvidence] = useState<BookingEvidence[]>([]);
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
    const result = await completeBooking(booking.id, evidence.length > 0 ? evidence : undefined);
    setBusy(false);
    if (result.ok) {
      onComplete(result.booking);
    } else {
      setError(result.error);
    }
  }

  const confirmationNote = booking.fulfillment.requiresCompletionConfirmation
    ? "The customer will confirm the service was completed — this opens the order for settlement and reviews."
    : "This service is auto-confirmed on completion, and the customer's review window opens right away.";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-booking-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-success-600" />
            <h2 id="complete-booking-title" className="text-sm font-bold text-neutral-900">
              Mark completed
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

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <p className="text-xs text-neutral-600">
            <strong>{booking.serviceName}</strong> · {booking.customer.name} · Finalize this
            appointment. The timeline records the completion for both parties.
          </p>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
            >
              <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error.message}
            </p>
          )}

          {booking.fulfillment.allowCompletionEvidence ? (
            <div>
              <span className="text-xs font-medium text-neutral-600">
                Completion evidence (optional)
              </span>
              <div className="mt-1.5">
                <EvidenceUpload
                  value={evidence}
                  onChange={setEvidence}
                  hint="Photos or a PDF proof of the completed work. Kept in-memory in this prototype."
                />
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              This service doesn&apos;t accept completion evidence — completing it is all that&apos;s
              needed to move the order forward.
            </p>
          )}

          <p className="rounded-lg border border-info-200 bg-info-50 p-3 text-xs text-info-800">
            {confirmationNote}
          </p>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors",
                busy ? "cursor-wait bg-success-400" : "bg-success-600 hover:bg-success-700"
              )}
            >
              {busy ? "Completing…" : "Complete booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}