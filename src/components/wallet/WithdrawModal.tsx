"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Info, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { formatNaira } from "@/lib/utils";
import { fetchBanks, fetchFinancialStatus, resolveBankAccount } from "@/services/financial-api";
import type { WithdrawPayload } from "@/services/wallet";
import {
  checkWithdrawal,
  describeLookupError,
  describeWithdrawError,
  identityBlock,
  identityPhase,
  maskAccount,
  MIN_WITHDRAWAL,
  newIdempotencyKey,
} from "@/lib/withdrawal";

const STEPS = ["Amount", "Account", "Review"] as const;

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Sends the request. Rejects with the failure, which keeps its status so a lost connection reads differently from a refusal. */
  onWithdraw: (payload: WithdrawPayload) => Promise<void>;
  balance: number;
  /** Earnings that have arrived but are still clearing. */
  clearing?: number;
  /** Where the one-time identity check lives for this person. */
  identityHref?: string;
}

/**
 * Take money out of the wallet: how much, to which of your own accounts, then a last look. A one-time identity
 * check comes first. The key lives for the whole visit, so a retry after a bad connection cannot take the money twice;
 * after an unclear failure the amount and account are locked, because the server answers a repeated key with the first request.
 */
export function WithdrawModal({ isOpen, onClose, onWithdraw, balance, clearing = 0, identityHref = "/profile/wallet" }: WithdrawModalProps) {
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [sure, setSure] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  const [sent, setSent] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const key = useRef(newIdempotencyKey());

  const status = useQuery({
    queryKey: ["financial", "status"],
    queryFn: fetchFinancialStatus,
    enabled: isOpen,
    refetchInterval: (q) => (identityPhase(q.state.data?.kyc) === "checking" ? 5000 : false),
  });
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

  const phase = identityPhase(status.data?.kyc);
  const block = status.isPending ? null : identityBlock(phase, status.data?.kycFailureReason);
  const amount = checkWithdrawal(text, balance);
  const accountName = holder.data?.accountName;
  const bank = banks.data?.find((b) => b.code === bankCode);

  function reset() {
    setStep(0);
    setText("");
    setAmountError(undefined);
    setBankCode("");
    setAccountNumber("");
    setSure(false);
    setProblem(undefined);
    setSent(null);
    setLocked(false);
    setSubmitting(false);
    key.current = newIdempotencyKey();
  }

  function close() {
    reset();
    onClose();
  }

  function toAccount() {
    if (!amount.ok) {
      setAmountError(amount.error);
      return;
    }
    setAmountError(undefined);
    setStep(1);
  }

  async function confirm() {
    if (!amount.ok || !bank || !accountName || !sure || submitting) return;
    setProblem(undefined);
    setSubmitting(true);
    try {
      await onWithdraw({
        amount: amount.amount,
        destination: { bankCode, accountNumber, accountName },
        idempotencyKey: key.current,
      });
      setSent(amount.amount);
    } catch (e) {
      const failure = describeWithdrawError(e as { status?: number; code?: string | number; message?: string });
      if (failure.kind === "duplicate") {
        setSent(amount.amount); // the first request got through
      } else {
        setProblem(failure.message);
        setSure(false);
        if (failure.kind === "unclear") setLocked(true);
        else key.current = newIdempotencyKey(); // refused: nothing was taken, so a fresh start is safe
      }
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-lg border border-kampmax-border px-3 py-2.5 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none focus:ring-1 focus:ring-kampmax-blue/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-kampmax-border px-4 py-3">
          <h2 id="withdraw-title" className="text-sm font-bold text-kampmax-text">
            Withdraw to bank
          </h2>
          <button onClick={close} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-kampmax-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {sent !== null ? (
            <div className="space-y-3 py-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success-600" aria-hidden />
              <p className="text-base font-bold text-kampmax-text">Withdrawal requested</p>
              <p className="text-sm text-kampmax-text-secondary">
                {formatNaira(sent)} has left your wallet and is waiting for the Kampmax team to review and pay it to {bank?.name ?? "your bank"}{" "}
                {maskAccount(accountNumber)}. You can follow it in your wallet history.
              </p>
              <Button onClick={close}>Done</Button>
            </div>
          ) : status.isPending ? (
            <p className="py-6 text-center text-sm text-kampmax-text-secondary">Loading…</p>
          ) : block ? (
            <div className="space-y-3 py-2">
              <p className="rounded-lg bg-kampmax-muted/50 p-3 text-sm text-kampmax-text">{block}</p>
              {phase !== "checking" && (
                <Link href={identityHref} onClick={close} className="inline-block text-sm font-semibold text-primary-600 hover:underline">
                  Verify my identity
                </Link>
              )}
            </div>
          ) : (
            <>
              <ol className="flex gap-2" aria-label="Steps">
                {STEPS.map((label, i) => (
                  <li
                    key={label}
                    aria-current={i === step ? "step" : undefined}
                    className={`flex-1 border-t-2 pt-1 text-xs font-medium ${i <= step ? "border-primary-600 text-primary-700" : "border-kampmax-border text-kampmax-text-muted"}`}
                  >
                    {label}
                  </li>
                ))}
              </ol>

              {step === 0 && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-kampmax-muted/50 p-3">
                    <p className="text-xs text-kampmax-text-secondary">Available to withdraw</p>
                    <p className="text-2xl font-bold text-kampmax-text">{formatNaira(balance)}</p>
                    <p className="mt-0.5 text-xs text-kampmax-text-muted">
                      {clearing > 0 ? `${formatNaira(clearing)} is still clearing and can't be withdrawn yet. ` : ""}Minimum {formatNaira(MIN_WITHDRAWAL)} · No fee
                    </p>
                  </div>
                  <div>
                    <label htmlFor="wd-amount" className="mb-1.5 block text-xs font-medium text-kampmax-text-secondary">
                      Amount (₦)
                    </label>
                    <input
                      id="wd-amount"
                      inputMode="decimal"
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value.replace(/[^\d.,]/g, ""));
                        setAmountError(undefined);
                      }}
                      placeholder="5000"
                      className={field}
                    />
                    {amountError && (
                      <p role="alert" className="mt-1 text-[11px] text-error-600">
                        {amountError}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {balance >= MIN_WITHDRAWAL && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setText(String(Math.floor(balance)));
                          setAmountError(undefined);
                        }}
                      >
                        Withdraw all
                      </Button>
                    )}
                    <Button className="ml-auto" disabled={!text.trim()} onClick={toAccount}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="wd-bank" className="mb-1.5 block text-xs font-medium text-kampmax-text-secondary">
                      Bank
                    </label>
                    <select id="wd-bank" value={bankCode} onChange={(e) => setBankCode(e.target.value)} className={field} disabled={banks.isPending}>
                      <option value="">{banks.isPending ? "Loading banks…" : "Select a bank"}</option>
                      {(banks.data ?? []).map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {banks.isError && <p className="mt-1 text-[11px] text-error-600">Couldn&apos;t load the banks. Close this and try again.</p>}
                  </div>
                  <div>
                    <label htmlFor="wd-account" className="mb-1.5 block text-xs font-medium text-kampmax-text-secondary">
                      Account number
                    </label>
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
                    {accountName && <p className="mt-1 text-xs font-semibold text-success-700">{accountName}</p>}
                    {accountReady && holder.isError && (
                      <p role="alert" className="mt-1 text-[11px] text-error-600">
                        {describeLookupError(holder.error as { status?: number; code?: string | number })}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-kampmax-text-muted">Only withdraw to an account in your own name.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setStep(0)}>
                      Back
                    </Button>
                    <Button className="ml-auto" disabled={!bank || !accountName} onClick={() => setStep(2)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && amount.ok && bank && (
                <div className="space-y-3">
                  <dl className="divide-y divide-kampmax-border rounded-xl border border-kampmax-border">
                    <ReviewRow label="Amount" value={formatNaira(amount.amount)} onChange={locked ? undefined : () => setStep(0)} />
                    <ReviewRow
                      label="To"
                      value={`${bank.name} ${maskAccount(accountNumber)}`}
                      detail={accountName}
                      onChange={locked ? undefined : () => setStep(1)}
                    />
                  </dl>
                  <p className="flex items-start gap-2 rounded-lg bg-info-50 p-3 text-xs text-info-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    The money leaves your wallet now. The Kampmax team reviews every withdrawal before paying it, so it is not instant.
                  </p>
                  <label className="flex items-start gap-2 text-sm text-kampmax-text">
                    <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5" />
                    This account is in my own name, and I&apos;ve checked the amount.
                  </label>
                  {problem && (
                    <p role="alert" className="rounded-lg bg-error-50 p-3 text-xs text-error-700">
                      {problem}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="ghost" disabled={submitting} onClick={close}>
                      {locked ? "Check my wallet first" : "Cancel"}
                    </Button>
                    <Button className="ml-auto" disabled={!sure || !accountName || submitting} onClick={() => void confirm()}>
                      {submitting ? "Requesting…" : locked ? "Try again with the same amount" : "Confirm withdrawal"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, detail, onChange }: { label: string; value: string; detail?: string; onChange?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div>
        <dt className="text-xs text-kampmax-text-secondary">{label}</dt>
        <dd className="text-sm font-bold text-kampmax-text">{value}</dd>
        {detail && <dd className="text-xs text-kampmax-text-secondary">{detail}</dd>}
      </div>
      {onChange && (
        <button type="button" onClick={onChange} className="text-xs font-semibold text-primary-600 hover:underline">
          Change
        </button>
      )}
    </div>
  );
}
