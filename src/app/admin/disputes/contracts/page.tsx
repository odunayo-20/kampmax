"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CheckCircle2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { ContractDisputeDialog } from "@/components/admin/disputes/ContractDisputeDialog";
import { ContractDisputeList } from "@/components/admin/disputes/ContractDisputeList";
import { DisputeKindTabs } from "@/components/admin/disputes/DisputeKindTabs";
import { cn, formatNaira } from "@/lib/utils";
import { contractDisputeService } from "@/services/admin";
import type { ContractDisputeCounts, ContractDisputeStatus } from "@/services/admin/contract-dispute.api";
import type { Paginated } from "@/types/admin";
import type { Engagement, EngagementDisputeOutcome } from "@/services/jobs";

type Tab = ContractDisputeStatus | "all";
const TABS: { key: Tab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

export default function AdminContractDisputesPage() {
  const [tab, setTab] = useState<Tab>("open");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [list, setList] = useState<Paginated<Engagement> | null>(null);
  const [counts, setCounts] = useState<ContractDisputeCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [selected, setSelected] = useState<Engagement | null>(null);
  const [ruling, setRuling] = useState(false);
  const [rulingError, setRulingError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setList(await contractDisputeService.list({ status: tab, page, pageSize }));
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [tab, page, pageSize]);

  const loadCounts = useCallback(async () => {
    try {
      setCounts(await contractDisputeService.getCounts());
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  function closeDialog() {
    setSelected(null);
    setRulingError(null);
  }

  async function resolve(outcome: EngagementDisputeOutcome, note: string) {
    if (!selected || ruling) return;
    setRuling(true);
    setRulingError(null);
    try {
      const done = await contractDisputeService.resolve(selected.id, outcome, note);
      const who =
        outcome === "RELEASE"
          ? done.freelancer.fullName || done.freelancer.username
          : done.employer.fullName || done.employer.username;
      setNotice(
        outcome === "RELEASE"
          ? `Settled — ${formatNaira(Number(done.agreedAmount))} paid to ${who}.`
          : `Settled — ${formatNaira(Number(done.agreedAmount))} refunded to ${who}.`
      );
      closeDialog();
      void loadList();
      void loadCounts();
    } catch (e) {
      setRulingError(errorMessage(e));
    } finally {
      setRuling(false);
    }
  }

  return (
    <>
      <DisputeKindTabs active="contracts" />
      <AdminPageHeader
        title="Contract disputes"
        description="Freelance contracts where someone reported a problem. The payment stays in escrow until you rule: pay the freelancer or refund the employer."
        actions={
          counts && (
            <span
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium",
                counts.byStatus.open > 0
                  ? "border-red-200 bg-red-50 text-kampmax-error"
                  : "border-kampmax-border bg-white text-kampmax-text-secondary"
              )}
            >
              <CircleAlert className="h-3.5 w-3.5 opacity-70" aria-hidden />
              {counts.byStatus.open} awaiting a ruling
            </span>
          )
        }
      />

      {notice && (
        <p
          role="status"
          className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-kampmax-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          {notice}
        </p>
      )}

      <div role="tablist" aria-label="Filter disputes" className="mb-3 flex gap-1 border-b border-kampmax-border px-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === key
                ? "border-kampmax-blue text-kampmax-blue"
                : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
            )}
          >
            {label}
            {counts && (
              <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
                {key === "all" ? counts.all : counts.byStatus[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <ContractDisputeList
        items={list?.items ?? []}
        loading={loading && !list}
        error={loadFailed}
        filtered={tab !== "all"}
        onRetry={() => void loadList()}
        onReview={(e) => {
          setNotice(null);
          setSelected(e);
        }}
      />

      {list && list.totalPages > 1 && (
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          totalPages={list.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPage(1);
            setPageSize(n);
          }}
          className="mt-3 rounded-lg border border-kampmax-border bg-white"
        />
      )}

      {selected && (
        <ContractDisputeDialog
          engagement={selected}
          busy={ruling}
          error={rulingError}
          onResolve={(outcome, note) => void resolve(outcome, note)}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
