"use client";

import Link from "next/link";
import { ArrowRight, Handshake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFreelancerContractsApi } from "@/services/contract";
import { CONTRACT_STATUS } from "@/types/contract";

// Dashboard "Next Contract Action" widget, from the freelancer's real engagements.

export function FreelancerNextContractAction() {
  const { data: contracts = [] } = useQuery({
    queryKey: ["freelancer", "contracts"],
    queryFn: getFreelancerContractsApi,
    retry: false,
  });

  const next = contracts.find(
    (c) =>
      c.status === CONTRACT_STATUS.PENDING_ACCEPTANCE ||
      c.status === CONTRACT_STATUS.REVISION_REQUESTED ||
      c.status === CONTRACT_STATUS.ACTIVE
  );

  if (!next) {
    return (
      <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <Handshake className="h-5 w-5" aria-hidden />
        </div>
        <p className="mt-3 text-sm font-bold text-kampmax-text">No contract action pending</p>
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          When a client accepts your proposal, your next required step will appear here.
        </p>
        <Link
          href="/freelancer/contracts"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
        >
          View contracts <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-kampmax-text-secondary">
        Next contract action
      </p>
      <p className="mt-1 text-base font-bold text-kampmax-text">{next.projectTitle}</p>
      <p className="mt-1 text-sm text-kampmax-text-secondary">{next.nextAction}</p>
      <Link
        href="/freelancer/contracts"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1258C7]"
      >
        Open contract <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
