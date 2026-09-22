"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMyProposalsApi } from "@/services/proposals";
import type { ProposalStatus } from "@/types/opportunity";
import { PROPOSAL_STATUS } from "@/types/opportunity";
import { PROPOSAL_FILTER_TABS } from "@/config/opportunity";
import {
  MyProposalsHeader,
  ProposalList,
  ProposalGridSkeleton,
  ProposalEmptyState,
  ProposalErrorState,
} from "@/components/freelancer/proposals";

import { cn } from "@/lib/utils";

type StatusFilter = ProposalStatus | "all";

function ProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Awaited<ReturnType<typeof getMyProposalsApi>>["proposals"]>([]);
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const statusParam = searchParams.get("status") ?? "all";
  const status: StatusFilter = PROPOSAL_FILTER_TABS.some(
    (t) => t.value === statusParam
  )
    ? (statusParam as StatusFilter)
    : "all";

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getMyProposalsApi({ status: status === "all" ? "all" : status }).then((response) => {
      if (cancelled) return;
      if (response.error || !response.result) {
        setError(response.error?.message ?? "We couldn't load your proposals.");
        setProposals([]);
        return;
      }
      setError(null);
      setProposals(response.result.data as never);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status]);
  const filtered = useMemo(
    () => (status === "all" ? proposals : proposals.filter((p) => p.status === status)),
    [proposals, status]
  );

  const counts = useMemo(() => {
    const c = {} as Record<StatusFilter, number>;
    c.all = proposals.length;
    for (const status of PROPOSAL_FILTER_TABS) {
      if (status.value !== "all") {
        c[status.value] = 0;
      }
    }
    for (const p of proposals) {
      c[p.status] = (c[p.status] ?? 0) + 1;
    }
    return c;
  }, [proposals]);

  function handleStatusChange(value: StatusFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") params.set("status", value);
    else params.delete("status");
    router.replace(`/freelancer/proposals?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {error && <ProposalErrorState message={error} onRetry={() => setError(null)} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <MyProposalsHeader count={proposals.length} />
      </div>

      {/* Status filter tabs */}
      <div
        className="flex gap-1 overflow-x-auto border-b border-neutral-200"
        role="tablist"
        aria-label="Filter proposals by status"
      >
        {PROPOSAL_FILTER_TABS.map((t) => {
          const active = status === t.value;
          const count = counts[t.value];
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              onClick={() => handleStatusChange(t.value)}
              className={cn(
                "shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
                active
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              )}
            >
              {t.label}
              {typeof count === "number" && count > 0 && (
                <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <ProposalGridSkeleton />
      ) : filtered.length === 0 ? (
        <ProposalEmptyState
          hasFilters={status !== "all"}
          onReset={() => handleStatusChange("all")}
        />
      ) : (
        <ProposalList proposals={filtered} />
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