"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { EmployerWalletCard } from "./EmployerWalletCard";
import { EngagementActions } from "@/components/engagements/EngagementActions";
import { dashboardKeys } from "@/lib/query-keys";
import { useEmployerContracts } from "@/hooks/use-employer-dashboard";
import { formatDate, formatNaira } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  EmployerDashboardEmpty,
  EmployerDashboardError,
  EmployerDashboardSkeleton,
} from "./EmployerDashboardSection";

export function EmployerContracts() {
  const query = useEmployerContracts();
  const queryClient = useQueryClient();
  const contracts = query.data ?? [];
  // A step changes the contract list and the dashboard counts/prompts.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["wallet"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Contracts</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">
          Work that started from the applications you hired.
        </p>
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
          action={{ href: "/employer/applications", label: "Review applications" }}
        />
      ) : (
        <ul className="space-y-3">
          {contracts.map((contract) => (
            <li key={contract.id} className="rounded-xl border border-kampmax-border bg-white p-4 sm:p-5">
              <article>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-kampmax-text">{contract.projectTitle}</h2>
                    <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                      {contract.freelancerName}
                      {contract.amount ? ` · ${formatNaira(contract.amount)}` : ""} · Due{" "}
                      {formatDate(contract.deadline)}
                    </p>
                  </div>
                  <ContractStatusBadge status={contract.status} />
                </div>

                {contract.nextAction && (
                  <p className="mt-3 rounded-lg bg-kampmax-bg px-3 py-2 text-xs text-kampmax-text-secondary">
                    {contract.nextAction}
                  </p>
                )}

                <EngagementActions
                  engagementId={contract.id}
                  status={contract.engagementStatus}
                  role="employer"
                  onChanged={refresh}
                />

                {contract.outstandingDeliverables > 0 && (
                  <p className="mt-2 text-xs font-medium text-info-700">
                    {contract.outstandingDeliverables}{" "}
                    {contract.outstandingDeliverables === 1 ? "deliverable" : "deliverables"} outstanding
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}