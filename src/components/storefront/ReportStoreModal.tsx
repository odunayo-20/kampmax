"use client";

import { useEffect, useState } from "react";
import { X, Flag, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportStoreReason } from "@/types/storefront";
import { reportStore } from "@/services/storefront";

interface ReportStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  userId: string;
  storeName: string;
}

const messageFor = (error: unknown) =>
  (error as { status?: number } | null)?.status === 409
    ? "You've already reported this store. Our team is reviewing it."
    : "Something went wrong submitting your report. Please try again.";

const reportReasons: { value: ReportStoreReason; label: string }[] = [
  { value: "fraud", label: "Fraud / scam" },
  { value: "counterfeit", label: "Counterfeit product" },
  { value: "prohibited", label: "Prohibited product" },
  { value: "misleading", label: "Misleading information" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Other" },
];

/**
 * "Report Store" dialog. Collects a reason + optional details and submits to the
 * backend for moderation review. Does NOT expose any internal moderation tools.
 */
export function ReportStoreModal({
  isOpen,
  onClose,
  vendorId,
  userId,
  storeName,
}: ReportStoreModalProps) {
  const [reason, setReason] = useState<ReportStoreReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!reason || sending) return;
    setError(null);
    setSending(true);
    try {
      await reportStore({ vendorId, reason, details });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setReason(null);
        setDetails("");
        onClose();
      }, 1800);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-store-title"
    >
      <div className="bg-white w-full max-w-md rounded-xl flex flex-col max-h-[85vh]">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-kampmax-border">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-kampmax-error" />
            <h2 id="report-store-title" className="text-sm font-bold text-kampmax-text">
              Report Store
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-kampmax-text-secondary hover:bg-kampmax-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-kampmax-success/10 flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-kampmax-success" />
            </div>
            <p className="text-sm font-semibold text-kampmax-text">Report Submitted</p>
            <p className="text-xs text-kampmax-text-secondary mt-1">
              Thank you. Our team will review your report.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-xs text-kampmax-text-secondary">
              Report {storeName}. Why are you reporting this store?
            </p>

            {error && (
              <p className="text-xs text-kampmax-error bg-kampmax-error/5 border border-kampmax-error/20 rounded-lg p-2.5">
                {error}
              </p>
            )}

            <div className="space-y-2">
              {reportReasons.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  aria-pressed={reason === r.value}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-colors",
                    reason === r.value
                      ? "border-kampmax-error bg-kampmax-error/5 text-kampmax-text"
                      : "border-kampmax-border text-kampmax-text-secondary hover:border-kampmax-text-secondary/50"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="report-details"
                className="block text-xs font-medium text-kampmax-text-secondary mb-1.5"
              >
                Additional details (optional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide more context..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-kampmax-border text-sm focus:outline-none focus:border-kampmax-blue resize-none"
              />
            </div>

            <button
              onClick={() => void handleSubmit()}
              disabled={!reason || sending}
              className="w-full py-2.5 rounded-xl bg-kampmax-error text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? "Sending…" : "Submit Report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
