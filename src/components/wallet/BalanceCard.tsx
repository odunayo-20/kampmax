"use client";

import { cn, formatNaira } from "@/lib/utils";
import { describeClearing } from "@/lib/wallet-clearing";
import { Wallet } from "@/types";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface BalanceCardProps {
  wallet: Wallet;
  onTopUp?: () => void;
  onWithdraw?: () => void;
}

export function BalanceCard({ wallet, onTopUp, onWithdraw }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <div className="bg-gradient-to-br from-kampmax-navy via-kampmax-navy to-kampmax-blue rounded-2xl p-5 text-white relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />

      <div className="relative">
        {/* Balance */}
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs text-white/60">Available Balance</p>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            {showBalance ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <p className="text-3xl font-bold tracking-tight">
          {showBalance ? formatNaira(wallet.balance) : "••••••"}
        </p>

        {/* Earnings still clearing: in the wallet, but not yet withdrawable */}
        {wallet.pendingAmount > 0 && (
          <p className="text-xs text-white/60 mt-1">
            {showBalance ? describeClearing(wallet.pendingAmount, wallet.clearing) : "•••• clearing"}
          </p>
        )}

        {/* Currency + active */}
        <p className="text-[10px] text-white/40 mt-2">
          {wallet.currency} · Active since{" "}
          {new Date(wallet.createdAt).toLocaleDateString("en-NG", {
            month: "short",
            year: "numeric",
          })}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {onTopUp && (
            <button
              onClick={onTopUp}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/15 transition-colors backdrop-blur-sm"
            >
              Top Up
            </button>
          )}
          {onWithdraw && (
            <button
              onClick={onWithdraw}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/15 transition-colors backdrop-blur-sm"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
