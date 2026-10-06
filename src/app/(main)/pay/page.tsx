"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Send, Download, X, Copy, Check } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Logo } from "@/components/ui/Logo";
import { FundingModal } from "@/components/wallet/FundingModal";
import { useAuth } from "@/lib/auth-context";
import { useWalletTopup } from "@/hooks/use-wallet-topup";
import { fetchMyWallet, fetchMyWalletTransactions } from "@/services/wallet";
import { fetchFinancialStatus } from "@/services/financial-api";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import type { WalletTransaction, WalletTransactionType } from "@/types";
import { cn, formatNaira } from "@/lib/utils";

const RECENT_COUNT = 5;

const TX_TITLES: Record<WalletTransactionType, string> = {
  deposit: "Top Up",
  withdrawal: "Withdrawal",
  payment: "Payment",
  purchase: "Purchase",
  refund: "Refund",
  transfer: "Transfer",
  vendor_payout: "Payout",
  loyalty_reward: "Reward",
};

function txIcon(type: WalletTransactionType): { emoji: string; tone: string } {
  switch (type) {
    case "deposit":
    case "refund":
    case "loyalty_reward":
      return { emoji: "⚡", tone: "bg-emerald-50 text-emerald-600" };
    case "purchase":
    case "payment":
      return { emoji: "🛍️", tone: "bg-blue-50 text-blue-600" };
    default:
      return { emoji: "↔️", tone: "bg-purple-50 text-purple-600" };
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function KampmaxPayPage() {
  const { user } = useAuth();
  const { notice, startTopup } = useWalletTopup();
  const [activeModal, setActiveModal] = useState<"fund" | "receive" | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const wallet = useQuery({
    queryKey: ["wallet", "pay", "wallet", user?.id],
    queryFn: fetchMyWallet,
    enabled: !!user,
  });
  const transactions = useQuery({
    queryKey: ["wallet", "pay", "transactions", user?.id],
    queryFn: () => fetchMyWalletTransactions({ limit: RECENT_COUNT }),
    enabled: !!user,
  });
  const financial = useQuery({
    queryKey: ["financial", "status"],
    queryFn: fetchFinancialStatus,
    enabled: !!user,
  });

  const account = financial.data?.account ?? null;
  const recent: WalletTransaction[] = (transactions.data ?? []).slice(0, RECENT_COUNT);

  function copyAccountNumber() {
    if (!account) return;
    void navigator.clipboard?.writeText(account.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  }

  return (
    <PageContainer className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size="md" />
          <span className="text-lg font-black text-primary-900 tracking-tight">Pay</span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● Protected by Kampmax Escrow
        </span>
      </div>

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

      {/* Wallet card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#0256E0] via-[#0066FF] to-[#0047BA] text-white p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-blue-100 tracking-wide">Wallet Balance</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
              {wallet.isPending ? "…" : wallet.isError ? "Unavailable" : formatNaira(wallet.data.balance)}
            </h2>
            {wallet.data && wallet.data.pendingAmount > 0 && (
              <p className="text-[11px] text-blue-100">
                {formatNaira(wallet.data.pendingAmount)} held in escrow
              </p>
            )}
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-3">
          {wallet.isError ? (
            <button
              onClick={() => void wallet.refetch()}
              className="px-5 py-2.5 rounded-full bg-white text-primary-700 text-xs font-extrabold shadow-md"
            >
              Retry
            </button>
          ) : (
            <button
              onClick={() => setActiveModal("fund")}
              disabled={wallet.isPending}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-blue-50 active:scale-95 text-primary-700 text-xs font-extrabold shadow-md transition-all disabled:opacity-60"
            >
              Fund Wallet
            </button>
          )}
          <span className="text-[11px] text-blue-100 font-medium text-right">
            {account
              ? `Account: ${account.accountNumber} (${account.bankName})`
              : "Dedicated account not set up yet"}
          </span>
        </div>
      </div>
      {wallet.isError && (
        <p className="text-xs text-red-600">{getFriendlyErrorMessage(wallet.error)}</p>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <button
          disabled
          title="Transfers between users are not available yet"
          className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-neutral-200/90 opacity-60 cursor-not-allowed"
        >
          <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-1.5">
            <Send className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-neutral-800">Send</span>
          <span className="text-[10px] text-neutral-400">Coming soon</span>
        </button>

        <button
          onClick={() => setActiveModal("receive")}
          className="group flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:border-primary-300 hover:shadow-xs active:scale-95 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Download className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-neutral-800">Receive</span>
        </button>

        <button
          disabled
          title="Virtual cards are not available yet"
          className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-neutral-200/90 opacity-60 cursor-not-allowed"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-neutral-800">Virtual Card</span>
          <span className="text-[10px] text-neutral-400">Coming soon</span>
        </button>
      </div>

      {/* Recent transactions */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Recent Transactions</h3>
          <Link href="/profile/wallet" className="text-xs font-semibold text-primary-600 hover:underline">
            See all
          </Link>
        </div>

        {transactions.isPending ? (
          <p className="py-6 text-center text-xs text-neutral-500">Loading…</p>
        ) : transactions.isError ? (
          <div className="py-6 text-center">
            <p className="text-xs text-neutral-500">Could not load your transactions.</p>
            <button
              onClick={() => void transactions.refetch()}
              className="mt-2 text-xs font-semibold text-primary-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : recent.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">No transactions yet.</p>
        ) : (
          <div className="space-y-2.5">
            {recent.map((tx) => {
              const icon = txIcon(tx.type);
              const credit = tx.direction === "credit";
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                        icon.tone
                      )}
                    >
                      {icon.emoji}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-neutral-900">{TX_TITLES[tx.type]}</h4>
                      <p className="text-xs text-neutral-500 line-clamp-1">{tx.description}</p>
                      <p className="text-[10px] text-neutral-400">
                        {formatWhen(tx.createdAt)}
                        {tx.status !== "completed" ? ` · ${tx.status}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-black",
                      credit ? "text-emerald-600" : "text-neutral-900"
                    )}
                  >
                    {credit ? "+" : "-"}
                    {formatNaira(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fund wallet (real Paystack top-up) */}
      <FundingModal
        isOpen={activeModal === "fund"}
        onClose={() => setActiveModal(null)}
        onFund={startTopup}
        balance={wallet.data?.balance ?? 0}
      />

      {/* Receive: the user's real dedicated account */}
      {activeModal === "receive" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Receive Money</h3>
              <p className="text-xs text-neutral-500">
                Transfers to your dedicated account are credited to your wallet.
              </p>
            </div>

            {account ? (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1 text-xs">
                <p className="font-bold text-blue-900">{account.accountName}</p>
                <p className="text-neutral-600">
                  Bank: <strong>{account.bankName}</strong>
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-neutral-900">
                    {account.accountNumber}
                  </span>
                  <button
                    onClick={copyAccountNumber}
                    className="text-primary-600 font-semibold flex items-center gap-1 hover:underline"
                  >
                    {copiedAccount ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedAccount ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-2">
                <p>You do not have a dedicated account yet. Complete verification to get one.</p>
                <Link href="/profile/wallet" className="font-semibold text-primary-600 hover:underline">
                  Complete verification
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
