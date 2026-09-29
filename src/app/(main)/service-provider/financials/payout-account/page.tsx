"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { SpFinancialsSkeleton } from "@/components/service-provider/financials/SpFinancialsSkeleton";
import { SpPayoutAccountCard } from "@/components/service-provider/financials/SpPayoutAccountCard";
import { SpPayoutAccountForm } from "@/components/service-provider/financials/SpPayoutAccountForm";
import { getPayoutAccount, getPayoutAccountLive, updatePayoutAccount, updatePayoutAccountLive } from "@/services/service-provider-financials";
import type { SpPayoutAccount, SpPayoutAccountInput, SpPayoutAccountResult } from "@/types/service-provider-financials";

const MISSING_ACCOUNT: SpPayoutAccount = {
  bankName: "",
  bankCode: "",
  accountName: "",
  maskedAccountNumber: "••••••••••",
  status: "missing",
  currency: "NGN",
  restrictions: [],
};

export default function PayoutAccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<SpPayoutAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getPayoutAccountLive()
      .then((acct) => {
        if (mounted) setAccount(acct);
      })
      .catch(() => {
        try {
          const acct = getPayoutAccount();
          if (mounted) setAccount(acct);
        } catch {
          if (mounted) setError("You don't have access to payout settings");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (input: SpPayoutAccountInput): Promise<SpPayoutAccountResult> => {
    try {
      const res = await updatePayoutAccountLive(input);
      if (res.ok && res.account) setAccount(res.account);
      return res;
    } catch {
      const res = updatePayoutAccount(input);
      if (res.ok && res.account) setAccount(res.account);
      return res;
    }
  };

  if (loading) return <SpFinancialsSkeleton />;
  if (error && !account)
    return <div className="text-center py-12 text-kampmax-text-secondary">{error}</div>;

  const current = account ?? MISSING_ACCOUNT;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Payout account</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Where your earnings are paid and how they&apos;re verified
          </p>
        </div>
      </header>

      <SpFinancialsSubnav />

      <SpPayoutAccountCard
        account={current}
        onRequestPayout={() => router.push("/service-provider/financials/payouts")}
        canRequest={current.status === "verified"}
      />

      <section aria-labelledby="manage-heading" className="rounded-xl border border-kampmax-border bg-white p-4">
        <div>
          <h2 id="manage-heading" className="text-lg font-semibold text-kampmax-text">
            Manage account details
          </h2>
          <p className="text-sm text-kampmax-text-secondary">
            Your account number is masked for security. Changes take effect after verification.
          </p>
        </div>
        <div className="mt-6">
          <SpPayoutAccountForm
            account={current}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/service-provider/financials")}
          />
        </div>
      </section>
    </div>
  );
}