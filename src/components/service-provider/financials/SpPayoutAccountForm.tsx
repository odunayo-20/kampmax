"use client";

import { useState, FormEvent } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { maskAccountNumber } from "@/data/service-provider-financials";
import type { SpPayoutAccount, SpPayoutAccountInput, SpPayoutAccountResult } from "@/types/service-provider-financials";

interface SpPayoutAccountFormProps {
  account: SpPayoutAccount;
  onSubmit: (input: SpPayoutAccountInput) => SpPayoutAccountResult | Promise<SpPayoutAccountResult>;
  onCancel: () => void;
}

/**
 * Payout account management. There is NO manual verification surface: the backend
 * owns verification, so saving always re-queues the account for verification.
 */
export function SpPayoutAccountForm({ account, onSubmit, onCancel }: SpPayoutAccountFormProps) {
  const [bankName, setBankName] = useState(account.bankName);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState(account.accountName);
  const [errors, setErrors] = useState<{ bankName?: string; accountNumber?: string; accountName?: string }>({});
  const [result, setResult] = useState<SpPayoutAccountResult | null>(null);

  const isDirty =
    bankName.trim() !== account.bankName ||
    accountName.trim() !== account.accountName ||
    accountNumber.trim().length > 0;

  const validate = (): boolean => {
    const next: { bankName?: string; accountNumber?: string; accountName?: string } = {};
    if (!bankName.trim()) next.bankName = "Bank is required";
    if (!/^\d{10}$/.test(accountNumber.trim())) next.accountNumber = "Enter the full 10-digit account number";
    if (!accountName.trim()) next.accountName = "Account name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const res = await Promise.resolve(onSubmit({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      }));
      setResult(res);
    } catch (err: any) {
      setResult({ ok: false, code: "error" as any, error: err?.message ?? "Update failed" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-kampmax-info/20 bg-info-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-kampmax-info" />
        <p className="text-sm text-kampmax-text-secondary">
          Changes to your payout account are verified by the platform before payouts resume.
          Once saved, your account moves to pending verification — no manual verification is available.
        </p>
      </div>

      {result?.ok && (
        <div className="rounded-lg border border-kampmax-success/20 bg-success-50 p-4">
          <p className="text-sm font-medium text-kampmax-success">
            Account details saved for re-verification.
          </p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            {result.account?.bankName} {result.account?.maskedAccountNumber} • Payouts may be delayed until verification completes.
          </p>
        </div>
      )}

      {result && !result.ok && (
        <div className="rounded-lg border border-kampmax-error/20 bg-error-50 p-4">
          <p className="text-sm font-medium text-kampmax-error">
            {result.error ?? "Your account details could not be saved."}
          </p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="sp-account-bank" className="mb-1.5 block text-sm font-medium text-kampmax-text">
            Bank
          </label>
          <Input
            id="sp-account-bank"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder={account.bankName}
            error={errors.bankName}
          />
          <p className="mt-1 text-xs text-kampmax-text-secondary">Current: {account.bankName}</p>
        </div>

        <div>
          <label htmlFor="sp-account-number" className="mb-1.5 block text-sm font-medium text-kampmax-text">
            Account number
          </label>
          <Input
            id="sp-account-number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Enter your full account number"
            error={errors.accountNumber}
            inputMode="numeric"
            maxLength={10}
            className="font-mono"
          />
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            Current on file: {account.maskedAccountNumber}
          </p>
        </div>

        <div>
          <label htmlFor="sp-account-name" className="mb-1.5 block text-sm font-medium text-kampmax-text">
            Account name
          </label>
          <Input
            id="sp-account-name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder={account.accountName}
            error={errors.accountName}
            className="capitalize"
          />
          <p className="mt-1 text-xs text-kampmax-text-secondary">Current: {account.accountName}</p>
        </div>

        <p className="text-xs text-kampmax-text-secondary">
          Payouts are made in NGN. You&apos;ll see {maskAccountNumber(accountNumber)} in confirmations until verification completes.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isDirty}>
          Save changes
        </Button>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}