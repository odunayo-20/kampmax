"use client";

import Link from "next/link";
import { useState } from "react";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import type { Engagement } from "@/services/jobs";
import { engagementToContract } from "@/services/contract";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { contractPriceLabel } from "@/lib/engagement-milestones";
import { CONTRACT_GROUPS, contractGroup, contractsHeadline, defaultContractGroup, isMyMove, nextStep, paidPercent, type ContractGroup, type Party } from "@/lib/contract-groups";

/**
 * A side's contracts in three groups (needs you, in progress, finished), each a short card that opens the contract's
 * own page. Shared by the freelancer and employer areas; the same list as the mobile app's contracts screen.
 */
export function ContractList({ engagements, party, hrefFor }: { engagements: Engagement[]; party: Party; hrefFor: (id: string) => string }) {
  const [picked, setPicked] = useState<ContractGroup | null>(null);
  const group = picked ?? defaultContractGroup(engagements, party);
  const counts: Record<ContractGroup, number> = { yours: 0, moving: 0, done: 0 };
  for (const e of engagements) counts[contractGroup(e, party)] += 1;
  const shown = engagements.filter((e) => contractGroup(e, party) === group);
  const headline = contractsHeadline(engagements, party);
  const groupMeta = CONTRACT_GROUPS.find((g) => g.id === group)!;

  return (
    <div className="space-y-4">
      {headline && <p role="status" className="rounded-lg bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-700">{headline}</p>}

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Show contracts">
        {CONTRACT_GROUPS.map((g) => {
          const active = group === g.id;
          return (
            <button
              key={g.id}
              role="tab"
              aria-selected={active}
              onClick={() => setPicked(g.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
                active ? "border-primary-600 bg-primary-600 text-white" : "border-kampmax-border bg-white text-kampmax-text hover:border-primary-400 hover:text-primary-700"
              )}
            >
              {g.label}
              <span className={cn("rounded-full px-1.5 text-xs font-semibold", active ? "bg-white/20 text-white" : "bg-kampmax-muted text-kampmax-text-secondary")}>{counts[g.id]}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-kampmax-text-secondary">{groupMeta.empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((e) => {
            const mine = isMyMove(e, party);
            const step = nextStep(e, party);
            const other = party === "freelancer" ? e.employer : e.freelancer;
            const otherName = other.fullName || other.username;
            const paid = e.paymentType === "FIXED" && e.milestones.length > 0 && e.status !== "CANCELLED" ? paidPercent(e) : null;
            return (
              <li key={e.id}>
                <Link href={hrefFor(e.id)} className={cn("block h-full rounded-xl border bg-white p-4 hover:shadow-sm", mine ? "border-warning-400" : "border-kampmax-border")}>
                  <div className="flex items-center justify-between gap-2">
                    {mine ? (
                      <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700">Your move</span>
                    ) : (
                      <ContractStatusBadge status={engagementToContract(e).status} />
                    )}
                    <span className="text-xs text-kampmax-text-secondary">{timeAgo(e.createdAt)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar src={other.avatar ?? undefined} name={otherName} size="sm" />
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-sm font-bold text-kampmax-text">{e.job.title}</span>
                      <span className="block truncate text-xs text-kampmax-text-secondary">{party === "freelancer" ? "Client" : "Freelancer"} · {otherName}</span>
                    </span>
                  </div>
                  {step && e.status !== "COMPLETED" && e.status !== "CANCELLED" && <p className="mt-3 text-xs text-kampmax-text-secondary">{step}</p>}
                  {paid !== null && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-kampmax-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={paid} aria-label="Paid so far">
                      <div className="h-full bg-success-500" style={{ width: `${paid}%` }} />
                    </div>
                  )}
                  <p className="mt-3 text-base font-bold text-kampmax-text">{contractPriceLabel(e)}</p>
                  {paid !== null && <p className="text-xs text-kampmax-text-secondary">{formatNaira((Number(e.agreedAmount) * paid) / 100)} paid so far</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
