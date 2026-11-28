"use client";

import { ContractList } from "@/components/contracts/ContractList";
import { EmployerWalletCard } from "./EmployerWalletCard";
import { useEmployerContracts } from "@/hooks/use-employer-dashboard";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  EmployerDashboardEmpty,
  EmployerDashboardError,
  EmployerDashboardSkeleton,
} from "./EmployerDashboardSection";
import { peopleHref } from "@/services/employer-people";

/**
 * The employer's contracts: the wallet first, then the contracts in three groups (needs you, in progress, finished).
 * Each card opens the contract's own page, where funding, reviewing and paying happen. The freelancer area uses the
 * same list.
 */
export function EmployerContracts() {
  const query = useEmployerContracts();
  const contracts = query.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Contracts</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">Work that started from the people you hired.</p>
      </div>

      <EmployerWalletCard />

      {query.isPending ? (
        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <EmployerDashboardSkeleton rows={5} />
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <EmployerDashboardError message={getFriendlyErrorMessage(query.error)} onRetry={query.refetch} />
        </div>
      ) : contracts.length === 0 ? (
        <EmployerDashboardEmpty
          title="No contracts yet"
          detail="Hiring a freelancer starts a contract here. Fund it to start work, then approve the delivered work to release payment."
          action={{ href: peopleHref(), label: "Review applicants" }}
        />
      ) : (
        <ContractList engagements={contracts.map((c) => c.engagement)} party="employer" hrefFor={(id) => `/employer/contracts/${id}`} />
      )}
    </div>
  );
}
