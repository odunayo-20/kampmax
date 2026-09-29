"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { X, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { formatNaira } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { SP_FINANCIAL_LIMITS } from "@/types/service-provider-financials";
import type { SpPayoutAccount, SpPayoutRequestInput, SpPayoutRequestResult } from "@/types/service-provider-financials";

interface SpPayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: SpPayoutRequestInput) => SpPayoutRequestResult | Promise<SpPayoutRequestResult>;
  account: SpPayoutAccount;
  available: number;
}

type ModalPhase = "idle" | "amount" | "confirm" | "submitting" | "success" | "error";

export function SpPayoutRequestModal({ isOpen, onClose, onSubmit, account, available }: SpPayoutRequestModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("idle");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [idempotencyKey, setIdempotencyKey] = useState(() => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  // Reset state and mint a fresh idempotency key each time the modal opens,
  // so a second open can never replay a previously used key.
  useEffect(() => {
    if (isOpen) {
      setPhase("amount");
      setAmount("");
      setConfirmed(false);
      setError(undefined);
      setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    } else {
      setPhase("idle");
    }
  }, [isOpen]);

  const fee = SP_FINANCIAL_LIMITS.PAYOUT_FEE;
  const amountVal = parseInt(amount, 10) || 0;
  const total = amountVal + fee;

  const validateAmount = (val: number): string | null => {
    if (val < SP_FINANCIAL_LIMITS.MIN_PAYOUT) {
      return `Minimum payout is ${formatNaira(SP_FINANCIAL_LIMITS.MIN_PAYOUT)}`;
    }
    if (val > SP_FINANCIAL_LIMITS.MAX_PAYOUT) {
      return `Maximum payout is ${formatNaira(SP_FINANCIAL_LIMITS.MAX_PAYOUT)}`;
    }
    if (val + SP_FINANCIAL_LIMITS.PAYOUT_FEE > available) {
      return `Insufficient balance. Available: ${formatNaira(available)} (includes ₦${SP_FINANCIAL_LIMITS.PAYOUT_FEE} fee)`;
    }
    return null;
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value.replace(/[^0-9]/g, ""));
    setError(undefined);
  };

  const handleNext = () => {
    const err = validateAmount(amountVal);
    if (err) {
      setError(err);
      return;
    }
    setError(undefined);
    setPhase("confirm");
  };

  const handleConfirmSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateAmount(amountVal);
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

    try {
      const res = await Promise.resolve(onSubmit({ amount: amountVal, idempotencyKey, confirmed: true }));
      if (res.ok) {
        setPhase("success");
      } else {
        setError(res.error ?? "Your payout could not be requested. Please try again in a moment.");
        setPhase("error");
      }
    } catch (err: any) {
      setError(err?.message ?? "Your payout could not be requested. Please try again in a moment.");
      setPhase("error");
    }
  };

  const handleClose = () => {
    if (phase !== "submitting") onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50", phase === "idle" && "hidden")}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sp-payout-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="sp-payout-modal-title" className="text-lg font-semibold text-kampmax-text">
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

        {phase === "amount" && (
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            <div className="mt-6 space-y-4">
              {account.status === "pending_verification" && (
                <div className="rounded-lg bg-warning-50 border border-kampmax-warning/20 p-3">
                  <div className="flex items-start gap-2 text-sm text-kampmax-warning">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Your payout account is pending verification. Payouts may be delayed.</span>
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="sp-payout-amount" className="block text-sm font-medium text-kampmax-text mb-1.5">
                  Amount (NGN)
                </label>
                <Input
                  id="sp-payout-amount"
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount"
                  error={error}
                  inputMode="numeric"
                  autoFocus
                />
                <p className="mt-1 text-xs text-kampmax-text-secondary">
                  Available: <strong>{formatNaira(available)}</strong> • Min {formatNaira(SP_FINANCIAL_LIMITS.MIN_PAYOUT)} • Fee {formatNaira(fee)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setAmount("5000"); setError(undefined); }}
                  className="rounded-lg border border-kampmax-border px-3 py-2 text-sm text-kampmax-text hover:bg-neutral-50"
                >
                  ₦5,000
                </button>
                <button
                  type="button"
                  onClick={() => { setAmount("10000"); setError(undefined); }}
                  className="rounded-lg border border-kampmax-border px-3 py-2 text-sm text-kampmax-text hover:bg-neutral-50"
                >
                  ₦10,000
                </button>
                <button
                  type="button"
                  onClick={() => { setAmount(String(Math.max(available, 0))); setError(undefined); }}
                  className="rounded-lg border border-kampmax-border px-3 py-2 text-sm text-kampmax-text hover:bg-neutral-50"
                >
                  Withdraw all
                </button>
              </div>

              {error && !amount && null}

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={!amount}>
                  Continue
                </Button>
              </div>
            </div>
          </form>
        )}

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
                  <span className="text-sm font-medium text-kampmax-text">Total debited</span>
                  <span className="text-lg font-bold text-kampmax-text">{formatNaira(total)}</span>
                </div>
              </div>

              <div className="rounded-lg bg-info-50 border border-kampmax-info/20 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-kampmax-info mt-0.5 shrink-0" />
                  <div className="text-xs text-kampmax-text-secondary space-y-1">
                    <p>Funds will be sent to {account.bankName} {account.maskedAccountNumber} ({account.accountName}).</p>
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

              {phase === "confirm" && error && (
                <div className="rounded-lg bg-error-50 border border-kampmax-error/20 p-3">
                  <div className="flex items-center gap-2 text-sm text-kampmax-error">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setPhase("amount")} className="flex-1">
                  Back
                </Button>
                <Button type="submit" disabled={!confirmed} className="flex-1">
                  Confirm payout
                </Button>
              </div>
            </div>
          </form>
        )}

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

        {phase === "success" && (
          <div className="mt-6 text-center space-y-4 animate-in fade-in">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
              <CheckCircle className="h-8 w-8 text-kampmax-success" />
            </div>
            <h3 className="text-lg font-semibold text-kampmax-text">Payout requested</h3>
            <p className="text-sm text-kampmax-text-secondary">
              Your payout of {formatNaira(amountVal)} is being processed and should arrive within 24 hours.
            </p>
            <Button className="w-full" onClick={() => { setPhase("idle"); onClose(); }}>
              Done
            </Button>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-6 text-center space-y-4 animate-in fade-in">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
              <AlertCircle className="h-8 w-8 text-kampmax-error" />
            </div>
            <h3 className="text-lg font-semibold text-kampmax-text">Request failed</h3>
            <p className="text-sm text-kampmax-text-secondary">{error ?? "Unknown error"}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setConfirmed(false); setPhase("amount"); }} className="flex-1">
                Try again
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}