"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { WalletStats } from "@/components/wallet/WalletStats";
import { TransactionItem } from "@/components/wallet/TransactionItem";
import { TransactionDetail } from "@/components/wallet/TransactionDetail";
import { FundingModal } from "@/components/wallet/FundingModal";
import { FinancialIdentityCard } from "@/components/wallet/FinancialIdentityCard";
import { useAuth } from "@/lib/auth-context";
import {
  fetchMyWallet,
  fetchMyWalletTransactions,
  startWalletTopup,
  verifyWalletTopup,
} from "@/services/wallet";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { formatNaira } from "@/lib/utils";
import { WalletTransaction, WalletTransactionType } from "@/types";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const filterTabs: { id: "all" | WalletTransactionType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "deposit", label: "Deposits" },
  { id: "purchase", label: "Purchases" },
  { id: "refund", label: "Refunds" },
  { id: "withdrawal", label: "Withdrawals" },
  { id: "loyalty_reward", label: "Rewards" },
  { id: "transfer", label: "Transfers" },
];

const WALLET_KEY = ["wallet", "profile"] as const;

export default function WalletPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"all" | WalletTransactionType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "processing" | "failed" | "cancelled">("all");
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [showFunding, setShowFunding] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const handledReturn = useRef(false);

  const walletQuery = useQuery({
    queryKey: [...WALLET_KEY, "wallet", user?.id],
    queryFn: fetchMyWallet,
    enabled: !!user,
  });
  const txQuery = useQuery({
    queryKey: [...WALLET_KEY, "transactions", user?.id],
    queryFn: () => fetchMyWalletTransactions({ limit: 50 }),
    enabled: !!user,
  });

  const topup = useMutation({
    mutationFn: async (amount: number) => {
      const result = await startWalletTopup(amount, `${window.location.origin}${window.location.pathname}`);
      if (!result.authorizationUrl) throw new Error("The payment page could not be opened.");
      window.location.assign(result.authorizationUrl);
    },
  });

  // Paystack sends the user back with ?reference=…; confirm it once, then tidy the URL.
  useEffect(() => {
    if (handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference?.startsWith("KMPX-TOP-")) return;
    handledReturn.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    verifyWalletTopup(reference)
      .then((result) => {
        setNotice(
          result.status === "SUCCESS"
            ? { tone: "ok", text: `${formatNaira(result.amount)} added to your wallet.` }
            : { tone: "error", text: "That payment was not completed, so nothing was charged." }
        );
        void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
      })
      .catch((error) => setNotice({ tone: "error", text: getFriendlyErrorMessage(error) }));
  }, [queryClient]);

  if (!user) return null;

  if (walletQuery.isPending) {
    return (
      <PageContainer className="space-y-4">
        <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Wallet" }]} />
        <p className="py-10 text-center text-sm text-kampmax-text-secondary">Loading your wallet…</p>
      </PageContainer>
    );
  }

  const wallet = walletQuery.data;
  if (walletQuery.isError || !wallet) {
    return (
      <PageContainer className="space-y-4">
        <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Wallet" }]} />
        <div className="bg-white rounded-xl border border-kampmax-border p-8 text-center">
          <p className="text-sm font-medium text-kampmax-text">We could not load your wallet</p>
          <p className="text-xs text-kampmax-text-secondary mt-1">
            {getFriendlyErrorMessage(walletQuery.error)}
          </p>
          <button
            type="button"
            onClick={() => void walletQuery.refetch()}
            className="mt-3 text-xs font-semibold text-kampmax-blue hover:underline"
          >
            Try again
          </button>
        </div>
        <FinancialIdentityCard />
      </PageContainer>
    );
  }

  const txs = txQuery.data ?? [];
  const filtered = txs.filter((tx) => {
    const matchType = filter === "all" || tx.type === filter;
    const matchStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchType && matchStatus;
  });

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs
        items={[{ label: "Profile", href: "/profile" }, { label: "Wallet" }]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-lg font-bold text-kampmax-text">Kampmax Wallet</h1>
      </div>

      {/* Balance */}
      <BalanceCard
        wallet={wallet}
        onTopUp={() => setShowFunding(true)}
      />

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-xl px-3 py-2 text-xs",
            notice.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          )}
        >
          {notice.text}
        </p>
      )}

      <FinancialIdentityCard />

      {/* Stats */}
      <WalletStats transactions={txs} />

      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0",
              filter === tab.id
                ? "bg-kampmax-navy text-white"
                : "bg-white text-kampmax-text-secondary border border-kampmax-border"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex gap-1.5">
        {(["all", "completed", "pending", "processing", "failed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
              statusFilter === s
                ? "bg-kampmax-blue/10 text-kampmax-blue"
                : "text-kampmax-text-secondary hover:bg-kampmax-muted"
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-kampmax-border overflow-hidden">
        {txQuery.isError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-kampmax-text-secondary">Could not load transactions.</p>
            <button
              type="button"
              onClick={() => void txQuery.refetch()}
              className="mt-2 text-xs font-semibold text-kampmax-blue hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-8 w-8 text-kampmax-text-secondary/30 mx-auto mb-2" />
            <p className="text-sm text-kampmax-text-secondary">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-kampmax-border">
            {filtered.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onClick={() => setSelectedTx(tx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl max-h-[85vh] flex flex-col">
            <div className="shrink-0 bg-white border-b border-kampmax-border px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-kampmax-text">Transaction Details</h2>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-sm text-kampmax-text-secondary"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <TransactionDetail transaction={selectedTx} />
            </div>
          </div>
        </div>
      )}

      {/* Funding Modal */}
      <FundingModal
        isOpen={showFunding}
        onClose={() => setShowFunding(false)}
        onFund={(amount) => topup.mutateAsync(amount).catch((e) => { throw new Error(getFriendlyErrorMessage(e)); })}
        balance={wallet.balance}
      />
    </PageContainer>
  );
}
