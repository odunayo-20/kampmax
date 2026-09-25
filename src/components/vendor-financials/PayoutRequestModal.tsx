"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { X, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { formatNaira } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { VENDOR_FINANCIAL_LIMITS } from "@/types/vendor-financials";
import type { PayoutRequestResult, PayoutRequestInput } from "@/types/vendor-financials";

interface PayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: PayoutRequestInput) => void | Promise<PayoutRequestResult | void>;
  available: number;
}

type ModalPhase = "idle" | "amount" | "confirm" | "submitting" | "success" | "error";

export function PayoutRequestModal({
  isOpen,
  onClose,
  onSubmit,
  available,
}: PayoutRequestModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("idle");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [idempotencyKey] = useState(() => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("amount");
      setAmount("");
      setConfirmed(false);
      setError(undefined);
    } else {
      setPhase("idle");
    }
  }, [isOpen]);

  const fee = VENDOR_FINANCIAL_LIMITS.PAYOUT_FEE;
  const amountVal = parseInt(amount, 10) || 0;
  const total = amountVal + fee;
  const net = amountVal;

  const validateAmount = (val: number): string | null => {
    if (val < VENDOR_FINANCIAL_LIMITS.MIN_PAYOUT) {
      return `Minimum payout is ${formatNaira(VENDOR_FINANCIAL_LIMITS.MIN_PAYOUT)}`;
    }
    if (val > VENDOR_FINANCIAL_LIMITS.MAX_PAYOUT) {
      return `Maximum payout is ${formatNaira(VENDOR_FINANCIAL_LIMITS.MAX_PAYOUT)}`;
    }
    const t = val + VENDOR_FINANCIAL_LIMITS.PAYOUT_FEE;
    if (t > available) {
      return `Insufficient balance. Available: ${formatNaira(available)} (includes ₦${VENDOR_FINANCIAL_LIMITS.PAYOUT_FEE} fee)`;
    }
    return null;
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setAmount(value);
    setError(undefined);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(String(value));
    setError(undefined);
  };

  const handleWithdrawAll = () => {
    setAmount(String(Math.max(0, available)));
    setError(undefined);
  };

  const handleNext = () => {
    const val = parseInt(amount, 10) || 0;
    const err = validateAmount(val);
    if (err) {
      setError(err);
      return;
    }
    setPhase("confirm");
  };

  const handleBack = () => {
    setPhase("amount");
  };

  const handleConfirmSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount, 10) || 0;
    const err = validateAmount(val);
    if (err) {
      setError(err);
      setPhase("amount");
      return;
    }
    if (!confirmed) {
      setError("Please confirm the payout details");
      return;
    }
    setPhase("submitting");
    setError(undefined);

    // Call parent submit; if it reports a failure, return to the form with the reason.
    void Promise.resolve(onSubmit({ amount: val, idempotencyKey, confirmed: true })).then((res) => {
      if (res && !res.ok) {
        setError(res.error ?? "We couldn't process your payout request.");
        setPhase("amount");
      }
    });
  };

  // Parent will call onClose when done; we just handle local UI
  const handleClose = () => {
    if (phase !== "submitting") {
      onClose();
    }
  };

  // Success/error handling via parent's result prop would be cleaner,
  // but for now we rely on parent closing the modal on success.
  // If parent doesn't close, we show success screen with Done button.

  if (!isOpen) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50", phase === "idle" && "hidden")}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="modal-title" className="text-lg font-semibold text-kampmax-text">
            Request payout
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={phase === "submitting"}
            className={cn(
              "text-kampmax-text-secondary hover:text-kampmax-text",
              phase === "submitting" && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Amount step */}
        {phase === "amount" && (
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-kampmax-text mb-1.5">
                  Amount (NGN)
                </label>
                <Input
                  id="amount"
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount"
                  error={error}
                  inputMode="numeric"
                />
                <p className="mt-1 text-xs text-kampmax-text-secondary">
                  Available: <strong>{formatNaira(available)}</strong> • Fee: {formatNaira(fee)} per payout
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAmount(5000)}
                  className="rounded-lg border border-kampmax-border px-3 py-2 text-sm text-kampmax-text hover:bg-neutral-50"
                >
                  ₦5,000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(10000)}
                  className="rounded-lg border border-kampmax-border px-3 py-2 text-sm text-kampmax-text hover:bg-neutral-50"
                >
                  ₦10,000
                </button>
                <button
                  type="button"
                  onClick={handleWithdrawAll}
                  className="rounded-lg border border-kampmax-border px-3 py-2 text-sm text-kampmax-text hover:bg-neutral-50"
                >
                  Withdraw all
                </button>
              </div>

              {error && (
                <div className="rounded-lg bg-error-50 border border-kampmax-error/20 p-3">
                  <div className="flex items-center gap-2 text-sm text-kampmax-error">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={!amount}>
                  Continue
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Confirm step */}
        {phase === "confirm" && (
          <form onSubmit={handleConfirmSubmit}>
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-neutral-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-kampmax-text-secondary">Payout amount</span>
                  <span className="font-semibold text-kampmax-text">{formatNaira(amountVal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-kampmax-text-secondary">Fee</span>
                  <span className="font-medium text-kampmax-text-secondary">{formatNaira(fee)}</span>
                </div>
                <div className="border-t border-kampmax-border pt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-kampmax-text">Net to you</span>
                  <span className="text-lg font-bold text-kampmax-success">{formatNaira(net)}</span>
                </div>
              </div>

              <div className="rounded-lg bg-info-50 border border-kampmax-info/20 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-kampmax-info mt-0.5 shrink-0" />
                  <div className="text-xs text-kampmax-text-secondary space-y-1">
                    <p>Funds will be sent to your verified GTBank account ending in 4317.</p>
                    <p>Processing typically completes within 24 hours.</p>
                    <p>This action cannot be reversed once submitted.</p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
                />
                <span className="text-sm text-kampmax-text">
                  I confirm the amount, destination, and fee. I understand this cannot be reversed.
                </span>
              </label>

              {error && (
                <div className="rounded-lg bg-error-50 border border-kampmax-error/20 p-3">
                  <div className="flex items-center gap-2 text-sm text-kampmax-error">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" type="button" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button type="submit" disabled={!confirmed} className="flex-1">
                  Confirm payout
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Submitting step */}
        {phase === "submitting" && (
          <div className="mt-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-kampmax-text">Processing payout…</h3>
            <p className="text-sm text-kampmax-text-secondary">
              Please wait while we submit your request.
            </p>
          </div>
        )}

        {/* Success step - parent should close modal, but show this as fallback */}
        {phase === "success" && (
          <div className="mt-6 text-center space-y-4 animate-in fade-in">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
              <CheckCircle className="h-8 w-8 text-kampmax-success" />
            </div>
            <h3 className="text-lg font-semibold text-kampmax-text">Payout requested</h3>
            <p className="text-sm text-kampmax-text-secondary">
              Your payout of {formatNaira(amountVal)} is being processed.
            </p>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        )}

        {/* Error step */}
        {phase === "error" && (
          <div className="mt-6 text-center space-y-4 animate-in fade-in">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
              <AlertCircle className="h-8 w-8 text-kampmax-error" />
            </div>
            <h3 className="text-lg font-semibold text-kampmax-text">Request failed</h3>
            <p className="text-sm text-kampmax-text-secondary">{error ?? "Unknown error"}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPhase("amount")} className="flex-1">
                Try again
              </Button>
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}