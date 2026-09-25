"use client";

import { useMemo, useState, use } from "react";
import { useVendorPromotionCounts, useVendorPromotions } from "@/hooks/use-vendor-promotions";
import { getDefaultVendorPromotionPermissions } from "@/types/vendor-promotions";
import { PromotionsHeader } from "@/components/vendor-promotions/PromotionsHeader";
import { PromotionStatsBar } from "@/components/vendor-promotions/PromotionStatsBar";
import { PromotionsToolbar } from "@/components/vendor-promotions/PromotionsToolbar";
import { PromotionsTable } from "@/components/vendor-promotions/PromotionsTable";
import { PromotionsGrid } from "@/components/vendor-promotions/PromotionsGrid";
import { PromotionsSkeleton } from "@/components/vendor-promotions/PromotionsSkeleton";
import { VendorPagination } from "@/components/vendor-shared/VendorPagination";
import type { VendorPromotionStatus, VendorPromotionSortField } from "@/types/vendor-promotions";

const PAGE_SIZE = 10;

export default function VendorPromotionsPage({ params }: { params: Promise<{}> }) {
  use(params);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VendorPromotionStatus | "all">("all");
  const [sort, setSort] = useState<VendorPromotionSortField>("newest");

  const countsQuery = useVendorPromotionCounts();
  const promotionsQuery = useVendorPromotions({
    search: search || undefined,
    status,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const stats = countsQuery.data ?? { all: 0, draft: 0, scheduled: 0, active: 0, paused: 0, expired: 0, cancelled: 0, totalUsage: 0 };
  const permissions = useMemo(() => getDefaultVendorPromotionPermissions(), []);
  const result = promotionsQuery.data;
  const loading = promotionsQuery.isPending;
  // Mutations invalidate the promotion queries themselves.
  const refresh = () => {};

  const hasActiveFilters = search !== "" || status !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setSort("newest");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PromotionsHeader stats={stats} canCreate={permissions["promotions.create"]} />

      <PromotionStatsBar stats={stats} />

      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <PromotionsToolbar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          status={status}
          onStatusChange={(v) => { setStatus(v); setPage(1); }}
          sort={sort}
          onSortChange={(v) => { setSort(v); setPage(1); }}
          total={result?.total ?? 0}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />

        <div className="mt-4">
          {loading ? (
            <PromotionsSkeleton />
          ) : promotionsQuery.isError || !result ? (
            <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
              <p className="text-sm font-medium text-error-700">Couldn&apos;t load your promotions.</p>
              <button type="button" onClick={() => promotionsQuery.refetch()} className="mt-2 text-xs font-semibold text-error-700 underline">
                Try again
              </button>
            </div>
          ) : result.items.length === 0 ? (
            <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
              <p className="text-sm font-medium text-kampmax-text">No promotions yet</p>
              <p className="mt-1 text-xs text-kampmax-text-secondary">Create a promotion to offer discounts to your customers.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <PromotionsTable promotions={result.items} permissions={permissions} onChanged={refresh} />
              </div>
              <div className="md:hidden">
                <PromotionsGrid promotions={result.items} permissions={permissions} onChanged={refresh} />
              </div>
            </>
          )}
        </div>

        <VendorPagination
          page={result?.page ?? 1}
          totalPages={result?.totalPages ?? 1}
          total={result?.total ?? 0}
          pageSize={result?.pageSize ?? PAGE_SIZE}
          itemLabel="promotions"
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}