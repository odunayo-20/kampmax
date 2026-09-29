"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark, Wallet } from "lucide-react";
import { formatNairaCompact } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { Pagination } from "@/components/admin/Pagination";
import {
  FinanceOverviewCards,
} from "@/components/admin/wallet/FinanceOverviewCards";
import {
  TransactionsFilters,
  type FinanceTxnFilterState,
} from "@/components/admin/wallet/TransactionsFilters";
import { TransactionsTable } from "@/components/admin/wallet/TransactionsTable";
import { WalletAccountsSection } from "@/components/admin/wallet/WalletAccountsSection";
import { financeManagementService } from "@/services/admin";
import type {
  FinanceOverview,
  ManagedFinanceTxn,
  Paginated,
} from "@/types/admin";

const VALID_TYPES = [
  "credit",
  "debit",
  "refund",
  "commission",
  "settlement",
  "withdrawal",
  "adjustment",
] as const;
type ValidType = (typeof VALID_TYPES)[number];

function parseInitialFilters(): FinanceTxnFilterState {
  if (typeof window === "undefined") {
    return { search: "", type: "all", status: "all", pool: "all" };
  }
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") as ValidType;
  const pool = params.get("pool");
  return {
    search: params.get("q") ?? "",
    type: (VALID_TYPES as readonly string[]).includes(type ?? "") ? type : "all",
    status: params.get("status") === "pending" ? "pending" : "all",
    pool:
      pool === "platform" || pool === "vendor" || pool === "customer"
        ? pool
        : "all",
  };
}

export default function AdminWalletPage() {
  const [filters, setFilters] = useState<FinanceTxnFilterState>(parseInitialFilters);
  const debouncedSearch = useDebounce(filters.search, 350);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState<"createdAt" | "amount">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [list, setList] = useState<Paginated<ManagedFinanceTxn> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await financeManagementService.listTransactions({
        search: debouncedSearch.trim() || undefined,
        type: filters.type,
        status: filters.status,
        pool: filters.pool,
        sortBy,
        sortDir,
        page,
        pageSize,
      });
      setList(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const o = await financeManagementService.getOverview();
        if (!cancelled) setOverview(o);
      } catch {
        /* non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function patchFilters(patch: Partial<FinanceTxnFilterState>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);

    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    if (next.search.trim()) params.set("q", next.search.trim());
    if (next.type !== "all") params.set("type", next.type);
    if (next.status !== "all") params.set("status", next.status);
    if (next.pool !== "all") params.set("pool", next.pool);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/admin/wallet?${qs}` : "/admin/wallet");
  }

  function toggleSort(field: "createdAt" | "amount") {
    if (field === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  }

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.pool !== "all";

  return (
    <>
      <AdminPageHeader
        title="Wallet &amp; Finance"
        description="Platform float against vendor payables and customer wallet liabilities - every figure reconciles to the ledger below."
        actions={
          overview && (
            <>
              <span className="hidden h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text-secondary sm:inline-flex">
                <Landmark className="h-3.5 w-3.5 text-kampmax-blue" />
                Platform float {formatNairaCompact(overview.platform.balance)}
              </span>
              <span className="hidden h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text-secondary lg:inline-flex">
                <Wallet className="h-3.5 w-3.5 opacity-60" />
                {overview.customer.accounts} customer wallets
              </span>
            </>
          )
        }
      />

      {overview ? (
        <FinanceOverviewCards overview={overview} />
      ) : (
        <LoadingSkeleton variant="cards" rows={4} />
      )}

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-kampmax-text">
          <Landmark className="h-4 w-4 opacity-60" />
          Ledger transactions
        </h2>

        <TransactionsFilters filters={filters} onChange={patchFilters} />

        <TransactionsTable
          page={list}
          loading={loading}
          error={error}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
          onRetry={() => void loadList()}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() =>
            patchFilters({ search: "", type: "all", status: "all", pool: "all" })
          }
        />

        {list && list.totalPages > 1 && (
          <div className="mt-3 flex justify-center">
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
            />
          </div>
        )}
      </section>

      <WalletAccountsSection />
    </>
  );
}
