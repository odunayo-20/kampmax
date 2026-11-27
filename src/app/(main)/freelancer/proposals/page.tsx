"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMyProposalsApi } from "@/services/proposals";
import { defaultProposalGroup, groupFromParams, PROPOSAL_GROUPS, proposalGroup, type ProposalGroup } from "@/lib/proposal-groups";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  MyProposalsHeader,
  ProposalList,
  ProposalGridSkeleton,
  ProposalEmptyState,
  ProposalErrorState,
} from "@/components/freelancer/proposals";

import { cn } from "@/lib/utils";


function ProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Awaited<ReturnType<typeof getMyProposalsApi>>["proposals"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Everything is loaded once; the groups filter it here.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getMyProposalsApi({ limit: 100 }).then((response) => {
      if (cancelled) return;
      if (response.error || !response.result) {
        setError(response.error ? getFriendlyErrorMessage(response.error) : "We couldn't load your proposals.");
        setProposals([]);
        return;
      }
      setError(null);
      setProposals(response.proposals);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const counts = useMemo(() => {
    const c: Record<ProposalGroup, number> = { waiting: 0, won: 0, drafts: 0, closed: 0 };
    for (const p of proposals) c[proposalGroup(p.status)] += 1;
    return c;
  }, [proposals]);
  const group = groupFromParams(searchParams) ?? defaultProposalGroup(proposals.map((p) => p.status));
  const filtered = useMemo(() => proposals.filter((p) => proposalGroup(p.status) === group), [proposals, group]);
  const groupMeta = PROPOSAL_GROUPS.find((g) => g.id === group)!;

  function pick(next: ProposalGroup) {
    router.replace(`/freelancer/proposals?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {error && <ProposalErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <MyProposalsHeader count={proposals.length} />
      </div>

      {counts.won > 0 && group !== "won" && (
        <button type="button" onClick={() => pick("won")} className="flex w-full items-center justify-between rounded-lg bg-success-50 px-4 py-3 text-left text-sm font-semibold text-success-700">
          <span>{counts.won === 1 ? "An employer accepted 1 of your proposals" : `Employers accepted ${counts.won} of your proposals`}</span>
          <span>See</span>
        </button>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200" role="tablist" aria-label="Show proposals">
        {PROPOSAL_GROUPS.map((t) => {
          const active = group === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => pick(t.id)}
              className={cn(
                "shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
                active ? "border-primary-600 text-primary-700" : "border-transparent text-neutral-500 hover:text-neutral-900"
              )}
            >
              {t.label}
              {counts[t.id] > 0 && <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">{counts[t.id]}</span>}
            </button>
          );
        })}
      </div>

      {loading && proposals.length === 0 ? (
        <ProposalGridSkeleton />
      ) : proposals.length === 0 ? (
        <ProposalEmptyState hasFilters={false} onReset={() => pick("waiting")} />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">{groupMeta.empty}</p>
      ) : (
        // Keep the list on screen (dimmed) while it reloads, instead of a skeleton flash.
        <div aria-busy={loading} className={loading ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
          <ProposalList proposals={filtered} />
        </div>
      )}
    </div>
  );
}

export default function ProposalsPage() {
  return (
    <Suspense fallback={<ProposalGridSkeleton />}>
      <ProposalsContent />
    </Suspense>
  );
}