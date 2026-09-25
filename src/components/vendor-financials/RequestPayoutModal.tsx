"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertCircle, Building2, ArrowRight } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { useRequestPayout } from "@/hooks/use-vendor-financials";
import { VENDOR_FINANCIAL_LIMITS, VendorPayoutAccount } from "@/types/vendor-financials";
import { Button } from "@/components/ui";

interface RequestPayoutModalProps {
  account: VendorPayoutAccount;
  availableBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RequestPayoutModal({
  account,
  availableBalance,
  isOpen,
  onClose,
  onSuccess,
}: RequestPayoutModalProps) {
  const [amountStr, setAmountStr] = useState(String(availableBalance > 0 ? availableBalance : ""));
  const payoutMutation = useRequestPayout();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ reference: string; amount: number } | null>(null);

  if (!isOpen) return null;

  const amount = Number(amountStr) || 0;
  const minPayout = VENDOR_FINANCIAL_LIMITS.MIN_PAYOUT; // 5000
  const maxPayout = VENDOR_FINANCIAL_LIMITS.MAX_PAYOUT;
  const fee = VENDOR_FINANCIAL_LIMITS.PAYOUT_FEE; // 50
  const netAmount = Math.max(0, amount - fee);

  const isValidAmount = amount >= minPayout && amount <= availableBalance && amount <= maxPayout;

  function handleQuickPercent(percent: number) {
    const calculated = Math.floor((availableBalance * percent) / 100);
    setAmountStr(String(calculated));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAmount || !confirmed) return;

    setLoading(true);
    setError(null);

    const idempotencyKey = `payout-key-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const res = await payoutMutation.mutateAsync({
        amount,
        idempotencyKey,
        confirmed: true,
      });

      if (res.ok && res.payout) {
        setSuccessResult({
          reference: res.payout.reference,
          amount: res.payout.amount,
        });
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || "Failed to process payout request.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-neutral-900">Request Earnings Payout</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successResult ? (
          /* Success Screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Payout Submitted!</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Your payout request of <strong className="text-neutral-900">{formatNaira(successResult.amount)}</strong> is processing and will arrive in your account within 24 hours.
              </p>
            </div>

            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-neutral-500">Bank Name</span>
                <span className="font-semibold text-neutral-800">{account.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Account Number</span>
                <span className="font-semibold text-neutral-800">{account.maskedAccountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Reference ID</span>
                <span className="font-semibold text-neutral-800">{successResult.reference}</span>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl"
            >
              Done
            </Button>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Account Card */}
            <div className="p-3.5 bg-primary-50/60 rounded-xl border border-primary-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider">
                  Receiving Bank Account
                </span>
                <p className="text-sm font-bold text-neutral-900 mt-0.5">{account.accountName}</p>
                <p className="text-xs text-neutral-600">
                  {account.bankName} • {account.maskedAccountNumber}
                </p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                Verified
              </span>
            </div>

            {/* Amount Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-neutral-700">Withdrawal Amount (₦)</label>
                <span className="text-xs text-neutral-500">
                  Available: <strong className="text-primary-700">{formatNaira(availableBalance)}</strong>
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                  ₦
                </span>
                <input
                  type="number"
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setError(null);
                  }}
                  placeholder="0.00"
                  min={minPayout}
                  max={availableBalance}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-200 text-base font-bold text-neutral-900 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20 outline-none"
                />
              </div>

              {/* Quick Percent Buttons */}
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className="flex-1 py-1 text-xs font-semibold rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition-colors"
                  >
                    {pct === 100 ? "Max" : `${pct}%`}
                  </button>
                ))}
              </div>

              {amount > 0 && amount < minPayout && (
                <p className="text-[11px] text-error-600 font-medium mt-1">
                  Minimum withdrawal amount is {formatNaira(minPayout)}
                </p>
              )}
            </div>

            {/* Summary Breakdown */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-600">
                <span>Requested Amount</span>
                <span className="font-semibold text-neutral-800">{formatNaira(amount)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Bank Processing Fee</span>
                <span className="font-semibold text-neutral-800">-{formatNaira(fee)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-neutral-200 text-sm font-bold text-neutral-900">
                <span>Net Transfer Amount</span>
                <span className="text-emerald-700">{formatNaira(netAmount)}</span>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-error-50 border border-error-200 rounded-xl text-xs text-error-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-error-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
              />
              <span className="text-xs text-neutral-600 leading-snug">
                I confirm that I authorize this transfer to my verified bank account and agree to Kampmax escrow withdrawal rules.
              </span>
            </label>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={!isValidAmount || !confirmed || loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  "Processing Payout..."
                ) : (
                  <>
                    Confirm & Submit Payout <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
