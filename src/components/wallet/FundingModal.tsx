"use client";

import { useState } from "react";
import { cn, formatNaira } from "@/lib/utils";
import { X } from "lucide-react";

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Starts the payment. Resolves when it was handed off (the page usually navigates away); rejects with a user-facing message. */
  onFund: (amount: number) => Promise<void>;
  balance: number;
}

const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];


export function FundingModal({ isOpen, onClose, onFund, balance }: FundingModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "processing">("form");

  function handleClose() {
    setStep("form");
    setError(null);
    onClose();
  }

  if (!isOpen) return null;

  async function handleFund() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 100) return;
    setError(null);
    setStep("processing");
    try {
      await onFund(amt);
      // Paystack takes over the page; if we are still here, show the hand-off.
    } catch (e) {
      setStep("form");
      setError(e instanceof Error ? e.message : "Could not start the payment.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="shrink-0 border-b border-kampmax-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-kampmax-text">Fund Wallet</h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-kampmax-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "processing" && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-kampmax-blue border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-kampmax-text">Opening secure payment…</p>
            <p className="text-xs text-kampmax-text-secondary mt-1">
              Redirecting to payment gateway
            </p>
          </div>
        )}

        {step === "form" && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Current balance */}
              <div className="bg-kampmax-muted/50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-kampmax-text-secondary">Current Balance</span>
                <span className="text-sm font-bold text-kampmax-text">{formatNaira(balance)}</span>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min={100}
                  className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
                />
              </div>

              {/* Quick amounts */}
              <div>
                <p className="text-xs text-kampmax-text-secondary mb-2">Quick amounts</p>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(String(amt))}
                      className={cn(
                        "py-2 rounded-lg text-xs font-medium border transition-colors",
                        amount === String(amt)
                          ? "bg-kampmax-blue text-white border-kampmax-blue"
                          : "bg-white text-kampmax-text border-kampmax-border hover:border-kampmax-blue/50"
                      )}
                    >
                      {formatNaira(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </p>
              )}

              {/* Note */}
              <div className="bg-kampmax-muted/50 rounded-lg p-3">
                <p className="text-[11px] text-kampmax-text-secondary leading-relaxed">
                  Minimum top-up: {formatNaira(100)}. You will pay securely with Paystack, and
                  funds are added once the payment is confirmed.
                </p>
              </div>
            </div>

            {/* Footer - static, outside scroll area */}
            <div className="shrink-0 border-t border-kampmax-border px-4 py-3">
              <button
                onClick={handleFund}
                disabled={!amount || Number(amount) < 100}
                className="w-full py-3 rounded-xl bg-kampmax-blue text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Fund Wallet{amount ? ` · ${formatNaira(Number(amount))}` : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
