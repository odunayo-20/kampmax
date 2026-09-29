"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { SpTransactionsToolbar } from "@/components/service-provider/financials/SpTransactionsToolbar";
import { SpTransactionTable } from "@/components/service-provider/financials/SpTransactionTable";
import { SpPagination } from "@/components/service-provider/financials/SpPagination";
import { SpFinancialsSkeleton } from "@/components/service-provider/financials/SpFinancialsSkeleton";
import { getTransactions, getTransactionsLive } from "@/services/service-provider-financials";
import type { SpFinancialQuery, SpFinancialTransaction, SpFinancialPage } from "@/types/service-provider-financials";

const DEFAULT_PAGE_SIZE = 10;

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [query, setQuery] = useState<SpFinancialQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: "newest",
  });
  const [data, setData] = useState<SpFinancialPage<SpFinancialTransaction> | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from URL params
  useEffect(() => {
    const initialQuery: SpFinancialQuery = {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: "newest",
      search: searchParams.get("search") ?? undefined,
      type: (searchParams.get("type") as SpFinancialQuery["type"]) ?? "all",
      status: (searchParams.get("status") as SpFinancialQuery["status"]) ?? "all",
      sign: (searchParams.get("sign") as SpFinancialQuery["sign"]) ?? "all",
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    };
    setQuery(initialQuery);
    setPage(1);
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTransactionsLive(query);
      setData(result);
    } catch {
      try {
        const result = getTransactions(query);
        setData(result);
      } catch {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleQueryChange = (newQuery: Partial<SpFinancialQuery>) => {
    const merged = { ...query, ...newQuery, page: newQuery.page ?? 1 };
    setQuery(merged);
    setPage(merged.page ?? 1);
  };

  const handlePageChange = (newPage: number) => {
    handleQueryChange({ page: newPage });
  };

  if (loading) return <SpFinancialsSkeleton />;
  if (!data) return <div className="text-center py-12 text-kampmax-text-secondary">No access</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Transactions</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Complete ledger of all money movements
          </p>
        </div>
      </header>

      <SpFinancialsSubnav />

      <SpTransactionsToolbar
        query={query}
        onQueryChange={handleQueryChange}
        total={data.total}
      />

      <SpTransactionTable
        items={data.items}
        onRowClick={(tx) => router.push(`/service-provider/financials/transactions/${tx.id}`)}
      />

      <SpPagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={data.pageSize}
        itemLabel="transactions"
        onPageChange={handlePageChange}
      />
    </div>
  );
}