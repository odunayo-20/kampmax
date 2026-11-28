"use client";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, FileText, Lock, Wallet } from "lucide-react";
import { Skeleton } from "@/components/home/Skeleton";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { formatNaira } from "@/lib/utils";
import { fetchMyWalletBalance } from "@/services/wallet";
import { EmployerStatCard } from "./EmployerStatCard";
import type { EmployerDashboardQuerySource } from "./EmployerDashboardSection";

/** The money first (wallet and what is held in escrow), then the live jobs and contracts. The mobile hub opens the same way. */
export function EmployerStatsGrid({ query }: { query: EmployerDashboardQuerySource }) {
  const balance = useQuery({ queryKey: ["wallet", "balance"], queryFn: fetchMyWalletBalance });

  if (query.isPending && !query.data) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-kampmax-border bg-white p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-10" />
            <Skeleton className="mt-1.5 h-2.5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-4 text-center">
        <p className="text-sm font-medium text-error-700">
          {getFriendlyErrorMessage(query.error)}
        </p>
      </div>
    );
  }

  const s = query.data;
  if (!s) return null;
  const held = s.contracts.held;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <EmployerStatCard
        label="Wallet"
        value={balance.isSuccess ? formatNaira(balance.data.balance) : balance.isError ? "Unavailable" : "…"}
        context="Pays for postings and contracts"
        icon={Wallet}
        href="/employer/billing"
      />
      <EmployerStatCard
        label="In escrow"
        value={formatNaira(held.total)}
        context={held.count === 0 ? "Nothing held right now" : `${held.count} ${held.count === 1 ? "job" : "jobs"} funded`}
        icon={Lock}
        href="/employer/contracts"
      />
      <EmployerStatCard
        label="Active jobs"
        value={s.jobCounts.open}
        context={`${s.jobCounts.all} posted in total`}
        icon={Briefcase}
        href="/employer/jobs?group=live"
      />
      <EmployerStatCard
        label="Active contracts"
        value={s.contracts.active}
        context={s.contracts.waitingOnYou > 0 ? `${s.contracts.waitingOnYou} waiting for you` : "Nothing waiting for you"}
        icon={FileText}
        href="/employer/contracts"
      />
    </div>
  );
}
