"use client";

import { useEffect, useState } from "react";
import { X, Flag, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceReportReason } from "@/types/service-marketplace";
import { reportService } from "@/services/service-marketplace";

interface ServiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceName: string;
}

const reportReasons: { value: ServiceReportReason; label: string }[] = [
  { value: "fraud", label: "Fraud / scam" },
  { value: "misleading", label: "Misleading information" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

/**
 * "Report service" dialog. Collects a reason + optional details and submits for
 * moderation review — no deletion or moderation tooling is exposed here.
 */
export function ServiceReportModal({ isOpen, onClose, serviceId, serviceName }: ServiceReportModalProps) {
  const [reason, setReason] = useState<ServiceReportReason | null>(null);
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
      await reportService({ serviceId, reason, details });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setReason(null);
        setDetails("");
        onClose();
      }, 1800);
    } catch (err) {
      setError(
        (err as { status?: number } | null)?.status === 409
          ? "You've already reported this service. Our team is reviewing it."
          : "Something went wrong submitting your report. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-service-title"
    >
      <div className="bg-white w-full max-w-md rounded-xl flex flex-col max-h-[85vh]">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-error-600" />
            <h2 id="report-service-title" className="text-sm font-bold text-neutral-900">
              Report service
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-success-600" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Report submitted</p>
            <p className="text-xs text-neutral-500 mt-1">
              Thank you. Our team will review your report.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-xs text-neutral-500">
              Report {serviceName}. Why are you reporting this service?
            </p>

            {error && (
              <p className="text-xs text-error-600 bg-error-50 border border-error-200 rounded-lg p-2.5">
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
                      ? "border-error-500 bg-error-50 text-neutral-900"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="report-service-details"
                className="block text-xs font-medium text-neutral-600 mb-1.5"
              >
                Additional details (optional)
              </label>
              <textarea
                id="report-service-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide more context..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>

            <button
              onClick={() => void handleSubmit()}
              disabled={!reason || sending}
              className="w-full py-2.5 rounded-xl bg-error-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-error-700"
            >
              {sending ? "Sending…" : "Submit report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}