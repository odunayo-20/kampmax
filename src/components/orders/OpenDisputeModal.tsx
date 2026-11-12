"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";
import { Order } from "@/types";
import { Button } from "@/components/atoms/Button";

interface OpenDisputeModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  /** Files the dispute with the server. The modal only says "filed" when this resolves ok. */
  onSubmitDispute: (reason: string, statement: string) => Promise<{ ok: boolean; message?: string }>;
}

const DISPUTE_REASONS = [
  { id: "damaged", label: "Item is damaged, defective, or broken" },
  { id: "wrong_item", label: "Received wrong item or size" },
  { id: "not_delivered", label: "Item not received / Vendor no-show" },
  { id: "missing_parts", label: "Missing accessories or incomplete package" },
  { id: "other", label: "Other issue" },
];

export function OpenDisputeModal({
  order,
  isOpen,
  onClose,
  onSubmitDispute,
}: OpenDisputeModalProps) {
  const [selectedReason, setSelectedReason] = useState("damaged");
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape closes the dialog (keyboard users must not be trapped).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!statement.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    const reasonLabel =
      DISPUTE_REASONS.find((r) => r.id === selectedReason)?.label || selectedReason;
    try {
      const result = await onSubmitDispute(reasonLabel, statement.trim());
      if (result.ok) setSubmitted(true);
      else setError(result.message || "We couldn't file your dispute. Nothing was changed. Please try again.");
    } catch {
      setError("We couldn't reach Kampmax. Nothing was changed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-title"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-error-50/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-error-600" />
            <h2 id="dispute-title" className="text-base font-bold text-neutral-900">Report Issue / Open Dispute</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          /* Submitted Confirmation */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Dispute filed. Payout on hold</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Your claim for order <strong className="text-neutral-900">#{order.id}</strong> has been received. The vendor will not be paid while Kampmax Trust &amp; Safety reviews it. You will be notified of the outcome, and you can follow it on this order.
              </p>
            </div>
            <Button
              onClick={onClose}
              className="w-full bg-neutral-900 text-white font-semibold py-2.5 rounded-xl"
            >
              Done
            </Button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div>
              <label className="font-bold text-neutral-800 block mb-1.5">
                Select Reason for Dispute
              </label>
              <div className="space-y-2">
                {DISPUTE_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedReason === r.id
                        ? "border-error-500 bg-error-50/40 font-semibold text-neutral-900"
                        : "border-neutral-200 bg-neutral-50/50 text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispute_reason"
                      value={r.id}
                      checked={selectedReason === r.id}
                      onChange={() => setSelectedReason(r.id)}
                      className="h-4 w-4 text-error-600 focus:ring-error-500"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-neutral-800 block mb-1">
                Describe the Issue in Detail
              </label>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Explain what happened with your item..."
                rows={3}
                required
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs focus:border-error-500 focus:ring-1 focus:ring-error-500 outline-none resize-none"
              />
            </div>

            <p className="text-[11px] text-neutral-500">
              Photos or video? Don&apos;t worry about attaching them here. If we need proof, the
              Trust &amp; Safety team will ask you for it by message.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-tight">
              <span className="font-bold">What happens next:</span> the vendor is not paid while we review. Kampmax Trust &amp; Safety decides, and a refund goes back to your wallet if the claim is upheld.
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-error-200 bg-error-50 p-3 text-[11px] font-medium text-error-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-semibold text-xs hover:bg-neutral-50"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={!statement.trim() || submitting}
                className="flex-1 bg-error-600 hover:bg-error-700 text-white font-semibold py-2.5 rounded-xl text-xs disabled:opacity-50"
              >
                {submitting ? "Filing Dispute..." : "Submit Claim"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
