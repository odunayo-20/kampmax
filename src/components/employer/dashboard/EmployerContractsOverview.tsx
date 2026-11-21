"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { formatNaira, formatDate } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  EmployerDashboardEmpty,
  EmployerDashboardError,
  EmployerDashboardSection,
  EmployerDashboardSkeleton,
} from "./EmployerDashboardSection";
import type { EmployerDashboardQuerySource } from "./EmployerDashboardSection";
import { peopleHref } from "@/services/employer-people";

export function EmployerContractsOverview({
  query,
}: {
  query: EmployerDashboardQuerySource;
}) {
  const contracts = query.data?.contracts;

  if (query.isPending && !query.data) {
    return (
      <EmployerDashboardSection title="Contracts" action={{ href: "/employer/contracts", label: "All contracts" }}>
        <EmployerDashboardSkeleton rows={3} />
      </EmployerDashboardSection>
    );
  }

  if (query.isError && !query.data) {
    return (
      <EmployerDashboardSection title="Contracts" action={{ href: "/employer/contracts", label: "All contracts" }}>
        <EmployerDashboardError message={getFriendlyErrorMessage(query.error)} onRetry={query.refetch} />
      </EmployerDashboardSection>
    );
  }

  if (!contracts || contracts.total === 0) {
    return (
      <EmployerDashboardSection title="Contracts" action={{ href: "/employer/contracts", label: "All contracts" }}>
        <EmployerDashboardEmpty
          title="No contracts yet"
          detail="Contracts start automatically when you hire an applicant."
          action={{ href: peopleHref(), label: "Review applicants" }}
        />
      </EmployerDashboardSection>
    );
  }

  return (
    <EmployerDashboardSection title="Contracts" action={{ href: "/employer/contracts", label: "All contracts" }}>
      {contracts.awaitingClientReview > 0 && (
        <p className="mb-3 rounded-lg bg-info-50 px-3 py-2 text-xs font-medium text-info-700">
          {contracts.awaitingClientReview}{" "}
          {contracts.awaitingClientReview === 1 ? "contract has" : "contracts have"} work ready for
          your review.
        </p>
      )}

      <ul className="divide-y divide-kampmax-border/70">
        {contracts.recent.map((contract) => (
          <li key={contract.id} className="py-3 first:pt-0 last:pb-0">
            <Link
              href="/employer/contracts"
              className="group flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-kampmax-text">
                  {contract.projectTitle}
                </span>
                <span className="block text-xs text-kampmax-text-secondary">
                  {contract.freelancerName}
                  {contract.amount ? ` · ${formatNaira(contract.amount)}` : ""}
                  <span className="inline-flex items-center gap-1 align-middle">
                    {" "}
                    ·{" "}
                    <CalendarDays className="h-3 w-3" aria-hidden /> {formatDate(contract.deadline)}
                  </span>
                </span>
              </span>
              <ContractStatusBadge status={contract.status} />
            </Link>
          </li>
        ))}
      </ul>
    </EmployerDashboardSection>
  );
}