"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Scale } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { DisputesTable } from "@/components/admin/disputes/DisputesTable";
import {
  DISPUTE_STATUS_FILTER_ORDER,
  disputeStatusLabel,
} from "@/components/admin/disputes/disputes-meta";
import { disputeManagementService } from "@/services/admin";
import { communityCampusOptions } from "@/data/admin/community";
import type {
  CommunitySectionCounts,
  ManagedDispute,
  ManagedDisputeStatus,
  Paginated,
} from "@/types/admin";

export default function AdminDisputesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" rows={6} />}>
      <DisputesConsole />
    </Suspense>
  );
}

const CAMPUS_OPTIONS = communityCampusOptions();

function parseInitialStatus(params: { get(name: string): string | null }) {
  const raw = params.get("status");
  return DISPUTE_STATUS_FILTER_ORDER.includes(raw as ManagedDisputeStatus)
    ? (raw as ManagedDisputeStatus)
    : "all";
}

function DisputesConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ----- filters -----
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 350);
  const [status, setStatus] = useState<ManagedDisputeStatus | "all">(() =>
    parseInitialStatus(searchParams)
  );
  const [campusId, setCampusId] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ----- data -----
  const [list, setList] = useState<Paginated<ManagedDispute> | null>(null);
  const [counts, setCounts] =
    useState<CommunitySectionCounts<ManagedDisputeStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Keep the URL shareable without re-render loops.
  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : "/admin/disputes");
  }, [status]);

  const loadMeta = useCallback(async () => {
    try {
      setCounts(await disputeManagementService.getCounts());
    } catch {
      /* non-critical */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await disputeManagementService.list({
        search: search || undefined,
        status,
        campusId,
        page,
        pageSize,
      });
      setList(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, status, campusId, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const hasActiveFilters =
    searchInput.trim().length > 0 || status !== "all" || campusId !== "all";

  return (
    <>
      <AdminPageHeader
        title="Disputes"
        description="Every order that has ever carried a dispute. A dispute is an order — open one, refund the customer or dismiss it from the order itself."
        actions={
          counts && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-medium",
                  counts.byStatus.open > 0
                    ? "border-red-200 bg-red-50 text-kampmax-error"
                    : "border-kampmax-border text-kampmax-text-secondary"
                )}
              >
                <CircleAlert className="h-3.5 w-3.5 opacity-70" />
                {counts.byStatus.open} open
              </span>
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text-secondary">
                <Scale className="h-3.5 w-3.5 opacity-60" />
                {counts.all.toLocaleString("en-NG")} total cases
              </span>
            </div>
          )
        }
      />

      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Filter disputes by status"
        className="flex gap-1 overflow-x-auto border-b border-kampmax-border px-3 py-2 no-scrollbar"
      >
        {(["all", ...DISPUTE_STATUS_FILTER_ORDER] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={status === tab}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors",
              status === tab
                ? "border-kampmax-blue text-kampmax-blue"
                : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
            )}
          >
            {tab === "all" ? "All" : disputeStatusLabel(tab)}
            {counts && (
              <span className="rounded-full bg-kampmax-muted px-1.5 py-px text-[10px] font-semibold tabular-nums">
                {tab === "all" ? counts.all : counts.byStatus[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="my-3 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Input
            value={searchInput}
            placeholder="Search order, customer, vendor or reason…"
            aria-label="Search disputes"
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={campusId}
          aria-label="Filter by campus"
          onChange={(e) => {
            setCampusId(e.target.value);
            setPage(1);
          }}
          className="h-9 max-w-[170px] text-xs"
        >
          <option value="all">All campuses</option>
          {CAMPUS_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shortName} - {c.name}
            </option>
          ))}
        </Select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setStatus("all");
              setCampusId("all");
            }}
            className="text-xs font-medium text-kampmax-blue hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <DisputesTable
        items={list?.items ?? []}
        loading={loading && !list}
        error={error}
        hasActiveFilters={hasActiveFilters}
        onRetry={() => void loadList()}
        onClearFilters={() => {
          setSearchInput("");
          setStatus("all");
          setCampusId("all");
        }}
        onView={(d) => router.push(`/admin/orders/${d.id}`)}
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
    </>
  );
}
