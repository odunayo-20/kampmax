"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  fetchBanks,
  fetchFinancialStatus,
  resolveBankAccount,
  retryVirtualAccount,
  startFinancialOnboarding,
  type FinancialStatus,
} from "@/services/financial-api";

const QUERY_KEY = ["financial", "status"] as const;

/**
 * Shows the user's single financial identity (verification → wallet →
 * virtual account). It is per person, not per role, so it renders once no
 * matter how many roles the user holds and hides the form once verified.
 */
export function FinancialIdentityCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ bvn: "", accountNumber: "", bankCode: "" });

  const banks = useQuery({
    queryKey: ["financial", "banks"],
    queryFn: fetchBanks,
    staleTime: 60 * 60_000,
  });

  const { data: status } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchFinancialStatus,
    // Verification and account assignment complete asynchronously (webhooks).
    refetchInterval: (q) => {
      const s = q.state.data;
      return s && (s.kyc === "KYC_PENDING" || s.virtualAccount === "VIRTUAL_ACCOUNT_PENDING") ? 5000 : false;
    },
  });

  // Show who owns the account before the user submits, to catch typos.
  const accountReady = /^\d{10}$/.test(form.accountNumber) && form.bankCode.length > 0;
  const holder = useQuery({
    queryKey: ["financial", "resolve", form.accountNumber, form.bankCode],
    queryFn: () => resolveBankAccount(form.accountNumber, form.bankCode),
    enabled: accountReady,
    retry: false,
    staleTime: 10 * 60_000,
  });

  const onDone = (next: FinancialStatus) => queryClient.setQueryData(QUERY_KEY, next);
  const submit = useMutation({ mutationFn: startFinancialOnboarding, onSuccess: onDone });
  const retry = useMutation({ mutationFn: retryVirtualAccount, onSuccess: onDone });

  if (!status) return null;

  const steps = [
    { label: "Profile", done: true },
    { label: "Roles", done: true },
    { label: "Verification", done: status.kyc === "KYC_VERIFIED" },
    { label: "Wallet", done: status.financialProfile === "FINANCIAL_PROFILE_ACTIVE" },
    { label: "Account", done: status.virtualAccount === "VIRTUAL_ACCOUNT_ACTIVE" },
  ];
  const needsKyc = status.kyc === "KYC_NOT_STARTED" || status.kyc === "KYC_FAILED";
  const valid =
    /^\d{11}$/.test(form.bvn) && /^\d{10}$/.test(form.accountNumber) && form.bankCode.trim().length > 0;

  return (
    <div className="bg-white rounded-xl border border-kampmax-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-kampmax-blue" />
        <h2 className="text-sm font-bold text-kampmax-text">Financial verification</h2>
      </div>
      <p className="text-xs text-kampmax-text-secondary">
        Verified once for you. It covers every role you hold — customer, vendor, freelancer, service provider or
        employer — and uses this one wallet and account.
      </p>

      <ol className="flex items-center gap-1 text-[10px] font-medium">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-center gap-1">
            <span className={step.done ? "text-green-600" : "text-kampmax-text-secondary"}>
              {step.done ? "✓ " : ""}
              {step.label}
            </span>
            {i < steps.length - 1 && <span className="text-kampmax-text-secondary/40">›</span>}
          </li>
        ))}
      </ol>

      {status.kyc === "KYC_PENDING" && (
        <Row
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          text="Verification in progress. This usually takes a few minutes; you can leave this page."
        />
      )}

      {status.kyc === "KYC_VERIFIED" && (
        <Row
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          text={`Identity verified${status.maskedIdentifier ? ` (${status.maskedIdentifier})` : ""}`}
        />
      )}

      {status.kyc === "KYC_FAILED" && (
        <Row
          icon={<XCircle className="h-4 w-4 text-red-500" />}
          text={status.kycFailureReason ?? "Verification failed. Check your details and try again."}
        />
      )}

      {needsKyc && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) submit.mutate(form);
          }}
        >
          <input
            type="password"
            value={form.bvn}
            onChange={(e) => setForm({ ...form, bvn: e.target.value.replace(/D/g, "").slice(0, 11) })}
            placeholder="BVN (11 digits)"
            inputMode="numeric"
            autoComplete="off"
            aria-label="BVN"
            className="w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm"
          />
          <select
            value={form.bankCode}
            onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
            aria-label="Bank"
            disabled={banks.isPending || banks.isError}
            className="w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm"
          >
            <option value="">
              {banks.isPending ? "Loading banks…" : banks.isError ? "Banks unavailable" : "Select your bank"}
            </option>
            {(banks.data ?? []).map((bank) => (
              <option key={`${bank.code}-${bank.name}`} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          {banks.isError && (
            <button
              type="button"
              onClick={() => void banks.refetch()}
              className="text-xs font-semibold text-kampmax-blue hover:underline"
            >
              Reload banks
            </button>
          )}
          <input
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/D/g, "").slice(0, 10) })}
            placeholder="Account number (10 digits)"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Account number"
            className="w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm"
          />
          {accountReady && (
            <p
              className={
                holder.isError ? "text-xs text-red-500" : "text-xs text-kampmax-text-secondary"
              }
            >
              {holder.isPending
                ? "Checking account…"
                : holder.isError
                  ? "We could not find that account. Check the bank and number."
                  : `Account name: ${holder.data.accountName}`}
            </p>
          )}
          <p className="text-[11px] text-kampmax-text-secondary">
            The BVN and account must belong to the name on your Kampmax profile. Your BVN is sent for
            verification only and is never stored.
          </p>
          <button
            type="submit"
            disabled={!valid || submit.isPending}
            className="w-full rounded-lg bg-kampmax-navy py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submit.isPending ? "Submitting…" : "Verify identity"}
          </button>
          {submit.isError && <p className="text-xs text-red-500">{submitErrorMessage(submit.error)}</p>}
        </form>
      )}

      {status.kyc === "KYC_VERIFIED" && (
        <>
          <Row
            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            text={
              status.financialProfile === "FINANCIAL_PROFILE_ACTIVE"
                ? "Wallet active"
                : "Activating your wallet…"
            }
          />
          {status.virtualAccount === "VIRTUAL_ACCOUNT_ACTIVE" && status.account && (
            <div className="rounded-lg bg-kampmax-muted p-3 text-xs">
              <p className="font-semibold text-kampmax-text">{status.account.bankName}</p>
              <p className="text-lg font-bold tracking-wider text-kampmax-text">{status.account.accountNumber}</p>
              <p className="text-kampmax-text-secondary">{status.account.accountName}</p>
              <p className="mt-1 text-kampmax-text-secondary">Transfers here are added to your Kampmax wallet.</p>
            </div>
          )}
          {status.virtualAccount === "VIRTUAL_ACCOUNT_PENDING" && (
            <Row icon={<Clock className="h-4 w-4 text-amber-500" />} text="Setting up your virtual account…" />
          )}
          {status.virtualAccount === "VIRTUAL_ACCOUNT_FAILED" && (
            <div className="space-y-2">
              <Row icon={<XCircle className="h-4 w-4 text-red-500" />} text="We couldn't create your virtual account." />
              <button
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
                className="rounded-lg border border-kampmax-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {retry.isPending ? "Retrying…" : "Retry"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Verification rejections (400) carry a reason written for the user by our own
 * backend, so show it; anything else gets the generic friendly message.
 */
function submitErrorMessage(error: unknown): string {
  const e = error as { status?: number; message?: string } | null;
  if (e?.status === 400 && e.message && !/^bad request/i.test(e.message)) return e.message;
  return getFriendlyErrorMessage(error);
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-kampmax-text">
      {icon}
      <span>{text}</span>
    </div>
  );
}
