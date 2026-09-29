"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminErrorMessage } from "@/lib/admin/error-reporting";
import { Pagination } from "@/components/admin/Pagination";
import {
  CustomerWithdrawalsFilters,
  DEFAULT_CUSTOMER_WITHDRAWAL_FILTERS,
  type CustomerWithdrawalFilterState,
} from "@/components/admin/withdrawals/CustomerWithdrawalsFilters";
import { CustomerWithdrawalsTable } from "@/components/admin/withdrawals/CustomerWithdrawalsTable";
import { CUSTOMER_WITHDRAWAL_STATUS_TABS } from "@/components/admin/withdrawals/withdrawals-meta";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAdminWithdrawalCounts,
  useAdminWithdrawals,
} from "@/hooks/admin/use-admin-withdrawals";
import type { CustomerWithdrawalSortField, CustomerWithdrawalStatus, SortDir } from "@/types/admin";
import { formatNaira, formatNairaCompact } from "@/lib/utils";

function parseInitialFilters(params: URLSearchParams): CustomerWithdrawalFilterState {
  const rawStatus = params.get("status");
  const validStatus = CUSTOMER_WITHDRAWAL_STATUS_TABS as (CustomerWithdrawalStatus | "all")[];
  return {
    search: params.get("q") ?? "",
    status:
      rawStatus && validStatus.includes(rawStatus as CustomerWithdrawalStatus | "all")
        ? (rawStatus as CustomerWithdrawalStatus | "all")
        : "all",
  };
}

function parseInitialPage(params: URLSearchParams): number {
  const rawPage = Number.parseInt(params.get("page") ?? "", 10);
  return Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
}

export default function AdminWithdrawalsPage() {
  return (
    <Suspense fallback={<WithdrawalsSkeleton />}>
      <AdminWithdrawalsPageInner />
    </Suspense>
  );
}

function AdminWithdrawalsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<CustomerWithdrawalFilterState>(() =>
    parseInitialFilters(new URLSearchParams(searchParams.toString()))
  );
  const [sortBy, setSortBy] = useState<CustomerWithdrawalSortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(() => parseInitialPage(new URLSearchParams(searchParams.toString())));
  const [pageSize] = useState(15);

  const debouncedSearch = useDebounce(filters.search.trim(), 350);
  const query = useMemo(
    () => ({
      search: debouncedSearch,
      status: filters.status === "all" ? undefined : filters.status,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [debouncedSearch, filters, sortBy, sortDir, page, pageSize]
  );

  const { data, isLoading, error, refetch } = useAdminWithdrawals(query);
  const countsQuery = useAdminWithdrawalCounts();

  const urlParams = searchParams.toString();
  useEffect(() => {
    const timer = setTimeout(() => {
      const sp = new URLSearchParams();
      if (filters.search.trim()) sp.set("q", filters.search.trim());
      if (filters.status !== "all") sp.set("status", filters.status);
      if (page > 1) sp.set("page", String(page));
      const next = sp.toString();
      if (next !== urlParams) router.replace(`${pathname}?${next}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [filters, page, urlParams, router, pathname]);

  const patchFilters = useCallback((patch: Partial<CustomerWithdrawalFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: CustomerWithdrawalSortField) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir("desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const counts = countsQuery.data ?? null;
  const hasActiveFilters = filters.search.trim() !== "" || filters.status !== "all";

  return (
    <>
      <AdminPageHeader
        title="Withdrawals"
        description="Customer wallet withdrawals — refunds and store credit cashed out to a bank account. Vendor and freelancer earnings live on the Payouts console."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
            <ArrowDownToLine className="h-3.5 w-3.5" />
            {counts ? `${counts.all} records · ${formatNairaCompact(counts.totalVolume)}` : "…"}
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-kampmax-border bg-white px-4 py-2.5 text-xs text-kampmax-text-secondary">
        <span>
          Pending{" "}
          <strong className="font-semibold tabular-nums text-kampmax-warning">
            {counts?.byStatus.pending ?? "…"}
          </strong>
        </span>
        <span>
          Successful{" "}
          <strong className="font-semibold tabular-nums text-kampmax-success">
            {counts?.byStatus.successful ?? "…"}
          </strong>
        </span>
        <span>
          Failed{" "}
          <strong className="font-semibold tabular-nums text-kampmax-error">
            {counts?.byStatus.failed ?? "…"}
          </strong>
        </span>
        <span>
          Reversed <strong className="font-semibold tabular-nums">{counts?.byStatus.reversed ?? "…"}</strong>
        </span>
        <span className="text-kampmax-border">•</span>
        <span>
          Total volume{" "}
          <strong className="font-semibold tabular-nums">
            {counts ? formatNaira(counts.totalVolume) : "…"}
          </strong>
        </span>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-kampmax-border bg-kampmax-surface-hover/50 px-4 py-2.5 text-xs text-kampmax-text-secondary">
        <span>
          <strong className="font-medium">Scope note:</strong> this console covers customer wallet
          withdrawals only. No disbursement provider is wired into the prototype backend, so a
          withdrawal starts pending and stays there until an admin confirms with the bank and records
          the real outcome.
        </span>
      </div>

      <CustomerWithdrawalsFilters
        filters={filters}
        onChange={patchFilters}
        counts={
          counts?.byStatus ?? { successful: 0, pending: 0, failed: 0, reversed: 0 }
        }
      />

      {hasActiveFilters && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => patchFilters(DEFAULT_CUSTOMER_WITHDRAWAL_FILTERS)}
            className="rounded-md border border-kampmax-border px-2.5 py-1 text-xs font-medium text-kampmax-text-muted hover:text-kampmax-text"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="mt-4">
        {isLoading && !data ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-kampmax-surface-hover" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-kampmax-error/30 bg-kampmax-error/5 p-6 text-center">
            <p className="text-sm font-medium text-kampmax-error">Failed to load withdrawals</p>
            <p className="mt-1 text-xs text-kampmax-text-muted">{adminErrorMessage(error)}</p>
            <button
              onClick={() => void refetch()}
              className="mt-3 rounded-md bg-kampmax-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-kampmax-primary/90"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <CustomerWithdrawalsTable
              rows={data?.items ?? []}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={toggleSort}
              onOpen={(id) => router.push(`/admin/withdrawals/${id}`)}
              emptyHint={
                hasActiveFilters
                  ? "No withdrawals match the current filters."
                  : "No customer withdrawal records exist in the real wallet ledger yet."
              }
            />

            {data && data.totalPages > 1 && (
              <div className="mt-4 flex justify-end">
                <Pagination
                  page={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  totalPages={data.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function WithdrawalsSkeleton() {
  return (
    <>
      <div className="mb-6 h-10 w-48 animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="mb-4 h-6 w-full animate-pulse rounded bg-kampmax-surface-hover" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-kampmax-surface-hover" />
        ))}
      </div>
    </>
  );
}
