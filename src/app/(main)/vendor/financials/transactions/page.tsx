"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TransactionsToolbar } from "@/components/vendor-financials/TransactionsToolbar";
import { TransactionTable } from "@/components/vendor-financials/TransactionTable";
import { VendorPagination } from "@/components/vendor-shared/VendorPagination";
import { FinancialsSkeleton } from "@/components/vendor-financials/FinancialsSkeleton";
import { useFinancialTransactions } from "@/hooks/use-vendor-financials";
import type { VendorFinancialQuery } from "@/types/vendor-financials";

const DEFAULT_PAGE_SIZE = 10;

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [query, setQuery] = useState<VendorFinancialQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: "newest",
  });

  // Initialize from URL params
  useEffect(() => {
    const initialQuery: VendorFinancialQuery = {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: "newest",
      search: searchParams.get("search") ?? undefined,
      type: (searchParams.get("type") as VendorFinancialQuery["type"]) ?? "all",
      status: (searchParams.get("status") as VendorFinancialQuery["status"]) ?? "all",
      sign: (searchParams.get("sign") as VendorFinancialQuery["sign"]) ?? "all",
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    };
    setQuery(initialQuery);
    setPage(1);
  }, [searchParams]);

  const txQuery = useFinancialTransactions(query);
  const data = txQuery.data;

  const handleQueryChange = (newQuery: Partial<VendorFinancialQuery>) => {
    const merged = { ...query, ...newQuery, page: newQuery.page ?? 1 };
    setQuery(merged);
    setPage(merged.page ?? 1);
  };

  const handlePageChange = (newPage: number) => {
    handleQueryChange({ page: newPage });
  };

  if (txQuery.isPending) return <FinancialsSkeleton />;
  if (txQuery.isError || !data) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
        <p className="text-sm font-medium text-error-700">Couldn&apos;t load your transactions.</p>
        <button type="button" onClick={() => txQuery.refetch()} className="mt-2 text-xs font-semibold text-error-700 underline">
          Try again
        </button>
      </div>
    );
  }

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

      <TransactionsToolbar
        query={query}
        onQueryChange={handleQueryChange}
        total={data.total}
      />

      <TransactionTable items={data.items} onRowClick={(tx) => router.push(`/vendor/financials/${tx.id}`)} />

      <VendorPagination
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