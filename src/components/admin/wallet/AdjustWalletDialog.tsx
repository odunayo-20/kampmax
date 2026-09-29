"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";

interface AdjustWalletDialogProps {
  open: boolean;
  ownerName: string;
  balance: number;
  loading?: boolean;
  onConfirm: (input: { direction: "credit" | "debit"; amount: number; reason: string }) => void;
  onCancel: () => void;
}

/**
 * Manual credit/debit dialog for /admin/wallet's account table. Unlike
 * ConfirmDialog (a single reason field), this also needs an amount and a
 * direction, so it's its own small modal rather than a ConfirmDialog variant.
 */
export function AdjustWalletDialog({
  open,
  ownerName,
  balance,
  loading = false,
  onConfirm,
  onCancel,
}: AdjustWalletDialogProps) {
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setDirection("credit");
      setAmount("");
      setReason("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const parsedAmount = Number(amount);
  const valid =
    amount.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    reason.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-wallet-title"
    >
      <button
        type="button"
        aria-label="Cancel"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !loading && onCancel()}
      />
      <div className="relative w-full max-w-md rounded-xl border border-kampmax-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="adjust-wallet-title" className="text-sm font-semibold text-kampmax-text">
              Adjust {ownerName}&apos;s wallet
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-kampmax-text-secondary">
              Current balance {formatNaira(balance)}. This posts a real, audited ledger entry and
              notifies the owner.
            </p>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            {(["credit", "debit"] as const).map((d) => (
              <button
                key={d}
                type="button"
                disabled={loading}
                onClick={() => setDirection(d)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                  direction === d
                    ? d === "credit"
                      ? "border-kampmax-success bg-kampmax-success/10 text-kampmax-success"
                      : "border-kampmax-error bg-kampmax-error/10 text-kampmax-error"
                    : "border-kampmax-border text-kampmax-text-secondary hover:bg-kampmax-muted/60"
                )}
              >
                {d === "credit" ? "Credit (+)" : "Debit (−)"}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="adjust-amount" className="mb-1 block text-xs font-medium text-kampmax-text">
              Amount (NGN)
            </label>
            <input
              id="adjust-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              disabled={loading}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
            />
          </div>

          <div>
            <label htmlFor="adjust-reason" className="mb-1 block text-xs font-medium text-kampmax-text">
              Reason
            </label>
            <textarea
              id="adjust-reason"
              rows={3}
              maxLength={500}
              value={reason}
              disabled={loading}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !valid}
            onClick={() => onConfirm({ direction, amount: parsedAmount, reason: reason.trim() })}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-navy px-3.5 text-sm font-medium text-white transition-colors hover:bg-kampmax-navy-light disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {loading ? "Working…" : "Apply adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
}
