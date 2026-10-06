"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { fetchBanks, resolveBankAccount } from "@/services/financial-api";
import type { WithdrawPayload } from "@/services/wallet";

const MIN_WITHDRAWAL = 100;

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Sends the request. Rejects with a user-facing message. */
  onWithdraw: (payload: WithdrawPayload) => Promise<void>;
  balance: number;
}

export function WithdrawModal({ isOpen, onClose, onWithdraw, balance }: WithdrawModalProps) {
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const banks = useQuery({ queryKey: ["financial", "banks"], queryFn: fetchBanks, enabled: isOpen, staleTime: 60 * 60_000 });

  const accountReady = /^\d{10}$/.test(accountNumber) && bankCode.length > 0;
  const holder = useQuery({
    queryKey: ["financial", "resolve", accountNumber, bankCode],
    queryFn: () => resolveBankAccount(accountNumber, bankCode),
    enabled: isOpen && accountReady,
    retry: false,
    staleTime: 10 * 60_000,
  });

  if (!isOpen) return null;

  const value = Number(amount);
  const amountError =
    amount === "" ? null
    : !Number.isFinite(value) || value < MIN_WITHDRAWAL ? `The minimum is ${formatNaira(MIN_WITHDRAWAL)}.`
    : value > balance ? "That is more than your balance."
    : null;
  const canSubmit = !!holder.data?.accountName && amount !== "" && !amountError && !submitting;

  function reset() {
    setBankCode("");
    setAccountNumber("");
    setAmount("");
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit() {
    if (!canSubmit || !holder.data) return;
    setError(null);
    setSubmitting(true);
    try {
      await onWithdraw({
        amount: value,
        destination: { bankCode, accountNumber, accountName: holder.data.accountName },
      });
      reset();
      onClose();
    } catch (e) {
      setSubmitting(false);
      setError(e instanceof Error ? e.message : "Could not request your withdrawal.");
    }
  }

  const field =
    "w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl flex flex-col max-h-[85vh]">
        <div className="shrink-0 border-b border-kampmax-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-kampmax-text">Withdraw to bank</h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-kampmax-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-kampmax-muted/50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-kampmax-text-secondary">Available</span>
            <span className="text-sm font-bold text-kampmax-text">{formatNaira(balance)}</span>
          </div>

          <div>
            <label htmlFor="wd-bank" className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">Bank</label>
            <select id="wd-bank" value={bankCode} onChange={(e) => setBankCode(e.target.value)} className={field} disabled={banks.isPending}>
              <option value="">{banks.isPending ? "Loading banks…" : "Select a bank"}</option>
              {(banks.data ?? []).map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            {banks.isError && <p className="mt-1 text-[11px] text-red-600">Could not load banks. Close this and try again.</p>}
          </div>

          <div>
            <label htmlFor="wd-account" className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">Account number</label>
            <input
              id="wd-account"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit account number"
              className={field}
            />
            {accountReady && holder.isFetching && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-kampmax-text-secondary">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Checking account…
              </p>
            )}
            {holder.data && <p className="mt-1 text-xs font-semibold text-emerald-700">{holder.data.accountName}</p>}
            {accountReady && holder.isError && (
              <p className="mt-1 text-[11px] text-red-600">We couldn&apos;t find that account. Check the bank and number.</p>
            )}
          </div>

          <div>
            <label htmlFor="wd-amount" className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">Amount (₦)</label>
            <input
              id="wd-amount"
              type="number"
              min={MIN_WITHDRAWAL}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className={field}
            />
            {amountError && <p className="mt-1 text-[11px] text-red-600">{amountError}</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>
          )}

          <div className="bg-kampmax-muted/50 rounded-lg p-3">
            <p className="text-[11px] text-kampmax-text-secondary leading-relaxed">
              The amount leaves your wallet now and is paid to this account by Kampmax. It shows as pending until the
              transfer is made.
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-kampmax-border px-4 py-3">
          <button
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-kampmax-blue py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Requesting…" : "Request withdrawal"}
          </button>
        </div>
      </div>
    </div>
  );
}
