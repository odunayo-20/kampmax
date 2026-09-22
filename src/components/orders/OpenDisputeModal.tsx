"use client";

import { useState } from "react";
import { X, AlertTriangle, Upload, CheckCircle2, ShieldAlert } from "lucide-react";
import { Order } from "@/types";
import { Button } from "@/components/atoms/Button";

interface OpenDisputeModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDispute: (reason: string, statement: string) => void;
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

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!statement.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      const reasonLabel =
        DISPUTE_REASONS.find((r) => r.id === selectedReason)?.label || selectedReason;
      onSubmitDispute(reasonLabel, statement);
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-error-50/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-error-600" />
            <h2 className="text-base font-bold text-neutral-900">Report Issue / Open Dispute</h2>
          </div>
          <button
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
              <h3 className="text-xl font-bold text-neutral-900">Dispute Filed & Escrow Frozen</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Your claim for order <strong className="text-neutral-900">#{order.id}</strong> has been submitted. Escrow payout to the vendor is now frozen while Kampmax support reviews the case.
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

            {/* Photo Upload Simulation */}
            <div className="p-3 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50 text-center">
              <Upload className="w-5 h-5 mx-auto text-neutral-400 mb-1" />
              <span className="text-[11px] font-semibold text-neutral-600 block">
                Attach Photo / Video Proof (Optional)
              </span>
              <span className="text-[10px] text-neutral-400">PNG, JPG or MP4 up to 10MB</span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-tight">
              <span className="font-bold">Kampmax Buyer Escrow Protection:</span> Opening a dispute freezes funds in escrow until resolved by vendor agreement or Kampmax Trust & Safety.
            </div>

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
