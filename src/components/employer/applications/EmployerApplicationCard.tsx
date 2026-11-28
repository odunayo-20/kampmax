"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, Wallet } from "lucide-react";
import type { EmployerApplicationSummary } from "@/types/opportunity";
import { formatNaira, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { ProposalStatusBadge } from "@/components/freelancer/opportunities/StatusBadges";

function deliveryText(value: number, unit: string): string {
  const label = unit === "days" ? "day" : unit === "weeks" ? "week" : "month";
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

/**
 * One freelancer's proposal on a gig: who, the price (marked when it is the lowest still open), the payment parts
 * if they split it, and how long. Opens the proposal, where it is accepted or declined.
 */
export function EmployerApplicationCard({
  application,
  lowest = false,
}: {
  application: EmployerApplicationSummary;
  /** The cheapest of the proposals still open, out of at least two. */
  lowest?: boolean;
}) {
  const { proposal, job, candidate } = application;
  const parts = proposal.milestones ?? [];

  return (
    <article className="rounded-xl border border-neutral-200 bg-white transition-colors hover:border-primary-300">
      <Link
        href={`/employer/applications/${proposal.id}`}
        className="block p-5"
        aria-label={`Open ${candidate.name}'s proposal for ${job.title}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={candidate.name} src={candidate.avatar} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="truncate text-sm font-semibold text-neutral-900">
                  {candidate.name}
                </h3>
                <ProposalStatusBadge status={proposal.status} />
              </div>
              {candidate.headline ? (
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {candidate.headline}
                </p>
              ) : null}
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
        </div>

        <p className="mt-3 truncate text-sm font-medium text-primary-700">
          {job.title}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-600">
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            {proposal.proposedAmount !== undefined ? formatNaira(proposal.proposedAmount) : "Price not set"}
            {lowest && <span className="ml-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700">Lowest price</span>}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            {deliveryText(proposal.delivery.value, proposal.delivery.unit)}
          </span>
          <span className="ml-auto text-neutral-400">
            Sent {timeAgo(proposal.submittedAt ?? proposal.updatedAt)}
          </span>
        </div>
        {parts.length > 1 && (
          <p className="mt-2 text-xs text-neutral-600">
            In {parts.length} parts: {parts.map((m) => `${m.title} ${formatNaira(m.amount)}`).join(" · ")}
          </p>
        )}
      </Link>
    </article>
  );
}