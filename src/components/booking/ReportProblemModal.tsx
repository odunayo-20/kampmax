"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { reportBookingProblem } from "@/services/booking";
import { SERVICE_PROBLEM_CATEGORIES } from "@/config/service-order";
import { EvidenceUpload } from "./EvidenceUpload";
import type { BookingError, BookingEvidence, ServiceBooking, ServiceProblemCategory } from "@/types/booking";

/** Customer: report an issue on a completed booking. Handed to Kampmax support
 * — Kampmax support reviews it and settles the payment. */
export function ReportProblemModal({
  booking,
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
  onClose: () => void;
  onComplete: (updated: ServiceBooking) => void;
}) {
  const [category, setCategory] = useState<ServiceProblemCategory>("quality_issue");
  const [description, setDescription] = useState("");
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
    const result = await reportBookingProblem(booking.id, {
      category,
      description: description.trim(),
      evidence: evidence.length > 0 ? evidence : undefined,
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
      aria-labelledby="report-problem-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-error-600" />
            <h2 id="report-problem-title" className="text-sm font-bold text-neutral-900">
              Report a problem
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
            <strong>{booking.serviceName}</strong> — tell us what went wrong. Kampmax support
            will review the issue and follow up with you and the provider.
          </p>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error.message}
            </p>
          )}

          <fieldset>
            <legend className="text-xs font-medium text-neutral-600">What happened?</legend>
            <div className="mt-1.5 space-y-1.5">
              {SERVICE_PROBLEM_CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-2.5",
                    category === cat.value
                      ? "border-error-300 bg-error-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  )}
                >
                  <input
                    type="radio"
                    name="problem-category"
                    checked={category === cat.value}
                    onChange={() => setCategory(cat.value)}
                    className="mt-0.5 accent-error-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-neutral-800">{cat.label}</span>
                    <span className="block text-[11px] text-neutral-500">{cat.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Describe the issue</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. The braids started coming loose the same evening..."
              className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-error-400 focus:outline-none"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-neutral-600">Evidence (optional)</span>
            <div className="mt-1.5">
              <EvidenceUpload value={evidence} onChange={setEvidence} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || !description.trim()}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors",
                busy || !description.trim()
                  ? "cursor-not-allowed bg-error-300"
                  : "bg-error-600 hover:bg-error-700"
              )}
            >
              {busy ? "Submitting…" : "Report to support"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}