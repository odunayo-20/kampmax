"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useVendorCustomerCounts, useVendorCustomers } from "@/hooks/use-vendor-customers";
import { CustomersHeader } from "@/components/vendor-customers/CustomersHeader";
import { CustomersToolbar } from "@/components/vendor-customers/CustomersToolbar";
import { CustomersTable } from "@/components/vendor-customers/CustomersTable";
import { CustomersGrid } from "@/components/vendor-customers/CustomersGrid";
import { CustomersPagination } from "@/components/vendor-customers/CustomersPagination";
import { CustomerListSkeleton } from "@/components/vendor-customers/CustomerSkeleton";
import type { VendorCustomerSegment, VendorCustomerSortField } from "@/types/vendor-customers";

const PAGE_SIZE = 12;

export default function VendorCustomersPage({ params }: { params: Promise<{}> }) {
  use(params);
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<VendorCustomerSegment | "all">("all");
  const [sort, setSort] = useState<VendorCustomerSortField>("recent");

  const countsQuery = useVendorCustomerCounts();
  const customersQuery = useVendorCustomers({
    search: search || undefined,
    segment,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const counts = countsQuery.data ?? { all: 0, new: 0, returning: 0, frequent: 0, inactive: 0 };
  const result = customersQuery.data;

  const hasActiveFilters = search !== "" || segment !== "all";

  const clearFilters = () => {
    setSearch("");
    setSegment("all");
    setSort("recent");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <CustomersHeader counts={counts} />

      <CustomersToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        segment={segment}
        onSegmentChange={(v) => {
          setSegment(v);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(v) => {
          setSort(v);
          setPage(1);
        }}
        total={result?.total ?? 0}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {customersQuery.isPending ? (
        <CustomerListSkeleton />
      ) : customersQuery.isError || !result ? (
        <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
          <p className="text-sm font-medium text-error-700">Couldn&apos;t load your customers.</p>
          <button type="button" onClick={() => customersQuery.refetch()} className="mt-2 text-xs font-semibold text-error-700 underline">
            Try again
          </button>
        </div>
      ) : result.items.length === 0 ? (
        <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
          <p className="text-sm font-medium text-kampmax-text">No customers found</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            Customers appear once they place an order with your store.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <CustomersTable customers={result.items} onView={(c) => router.push(`/vendor/customers/${c.buyerId}`)} />
          </div>
          <div className="md:hidden">
            <CustomersGrid customers={result.items} onView={(c) => router.push(`/vendor/customers/${c.buyerId}`)} />
          </div>

          <CustomersPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}