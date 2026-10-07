"use client";

import { useCallback, useEffect, useState } from "react";
import { cn, formatNaira } from "@/lib/utils";
import {
  engagementToContract,
  getFreelancerEngagementsApi,
} from "@/services/contract";
import type { Engagement } from "@/services/jobs";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { EngagementActions } from "@/components/engagements/EngagementActions";
import { ContractEmptyState } from "@/components/contracts/ContractEmptyState";
import type { Contract, ContractStatus } from "@/types/contract";
import { CONTRACT_STATUS } from "@/types/contract";

// Freelancer contracts page with status filters. Data comes from the backend
// (services/contract). No fake production data.

type FilterKey = "ALL" | ContractStatus;

const FILTERS: { key: FilterKey; label: string; match: (c: Contract) => boolean }[] = [
  { key: "ALL", label: "All", match: () => true },
  { key: CONTRACT_STATUS.ACTIVE, label: "Active", match: (c) => c.status === CONTRACT_STATUS.ACTIVE },
  { key: CONTRACT_STATUS.PENDING_ACCEPTANCE, label: "Pending", match: (c) => c.status === CONTRACT_STATUS.PENDING_ACCEPTANCE },
  { key: CONTRACT_STATUS.AWAITING_CLIENT_REVIEW, label: "Awaiting Review", match: (c) => c.status === CONTRACT_STATUS.AWAITING_CLIENT_REVIEW },
  { key: CONTRACT_STATUS.REVISION_REQUESTED, label: "Revisions", match: (c) => c.status === CONTRACT_STATUS.REVISION_REQUESTED },
  { key: CONTRACT_STATUS.COMPLETED, label: "Completed", match: (c) => c.status === CONTRACT_STATUS.COMPLETED },
  { key: CONTRACT_STATUS.CANCELLED, label: "Cancelled", match: (c) => c.status === CONTRACT_STATUS.CANCELLED },
  { key: CONTRACT_STATUS.DISPUTED, label: "Disputed", match: (c) => c.status === CONTRACT_STATUS.DISPUTED },
];

export default function FreelancerContractsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  // The freelancer's real engagements from the backend.
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEngagements = useCallback(async () => {
    try {
      setEngagements(await getFreelancerEngagementsApi());
      setLoadError(null);
    } catch (e) {
      setLoadError((e as { message?: string }).message ?? "We couldn't load your contracts.");
    }
  }, []);
  useEffect(() => {
    void loadEngagements();
  }, [loadEngagements]);

  const contracts = engagements.map(engagementToContract);
  const engagementById = new Map(engagements.map((e) => [e.id, e]));

  const activeContractCount = contracts.filter(
    (c) => c.status !== CONTRACT_STATUS.COMPLETED && c.status !== CONTRACT_STATUS.CANCELLED
  ).length;
  const activeFilterDef = FILTERS.find((f) => f.key === activeFilter) ?? FILTERS[0];
  const filtered = contracts.filter(activeFilterDef.match);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-kampmax-text">Contracts</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          {activeContractCount > 0
            ? `You have ${activeContractCount} active contract${activeContractCount !== 1 ? "s" : ""}.`
            : "Your freelance contracts and projects."}
        </p>
      </header>

      {loadError && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 p-3 text-sm text-error-700">
          {loadError}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter contracts by status">
        {FILTERS.map((filter) => {
          const count = contracts.filter(filter.match).length;
          const active = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
                active
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-kampmax-border bg-white text-kampmax-text hover:border-primary-400 hover:text-primary-700"
              )}
            >
              {filter.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-semibold",
                  active ? "bg-white/20 text-white" : "bg-kampmax-muted text-kampmax-text-secondary"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <ContractEmptyState
          title="No contracts here yet"
          body="When a client accepts your proposal, your contract and project workspace will appear here."
          actionLabel="Browse services"
          actionHref="/services"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((contract) => {
            const engagement = engagementById.get(contract.id);
            // Engagements have no detail workspace; the card's actions live here.
            return engagement ? (
              <div key={contract.id} className="rounded-xl border border-kampmax-border bg-white p-4">
                <h2 className="text-sm font-bold text-kampmax-text">{contract.projectTitle}</h2>
                <p className="mt-0.5 text-xs text-kampmax-text-secondary">
                  {contract.client.displayName}
                  {contract.agreedAmount ? ` · ${formatNaira(contract.agreedAmount)}` : ""}
                </p>
                <div className="mt-2">
                  <ContractStatusBadge status={contract.status} />
                </div>
                <p className="mt-3 rounded-lg bg-kampmax-bg px-3 py-2 text-xs text-kampmax-text-secondary">
                  {contract.nextAction}
                </p>
                <EngagementActions
                  engagementId={engagement.id}
                  status={engagement.status}
                  role="freelancer"
                  onChanged={() => void loadEngagements()}
                />
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
