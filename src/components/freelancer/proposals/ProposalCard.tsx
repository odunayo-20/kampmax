"use client";

import Link from "next/link";
import { Wallet, Clock, Calendar } from "lucide-react";
import type { Proposal } from "@/types/opportunity";
import { formatNaira, timeAgo } from "@/lib/utils";
import { ProposalStatusBadge } from "../opportunities/StatusBadges";

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const hasAmount = proposal.proposedAmount !== undefined && proposal.proposedAmount > 0;

  return (
    <Link
      href={`/freelancer/proposals/${proposal.id}`}
      className="group block rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-wider text-primary-600">
            Opportunity
          </span>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-neutral-900 group-hover:text-primary-700">
            {proposal.jobTitle ?? "Opportunity"}
          </h3>
        </div>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-600">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{hasAmount ? formatNaira(proposal.proposedAmount!) : "No amount set"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>
            {proposal.delivery.value > 0
              ? `${proposal.delivery.value} ${proposal.delivery.unit}`
              : "No estimate"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{proposal.submittedAt ? timeAgo(proposal.submittedAt) : "Draft"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Updated {timeAgo(proposal.updatedAt)}</span>
        </div>
      </dl>
    </Link>
  );
}
