"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useVendorOrderCounts, useVendorOrders } from "@/hooks/use-vendor-orders";
import { OrderHeader } from "@/components/vendor-orders/OrderHeader";
import { OrdersToolbar } from "@/components/vendor-orders/OrdersToolbar";
import { OrdersFilters } from "@/components/vendor-orders/OrdersFilters";
import { OrdersTable } from "@/components/vendor-orders/OrdersTable";
import { OrdersGrid } from "@/components/vendor-orders/OrdersGrid";
import { OrdersPagination } from "@/components/vendor-orders/OrdersPagination";
import { OrderListSkeleton } from "@/components/vendor-orders/OrderSkeleton";
import type { VendorFulfillmentStatus, VendorOrderCounts } from "@/types/vendor-orders";

const PAGE_SIZE = 12;

const EMPTY_COUNTS: VendorOrderCounts = {
  all: 0, needsAction: 0, pending: 0, accepted: 0, processing: 0,
  readyForPickup: 0, shipped: 0, outForDelivery: 0, delivered: 0,
  completed: 0, cancelled: 0, paymentPending: 0, withIssues: 0,
};

export default function VendorOrdersPage({ params }: { params: Promise<{}> }) {
  use(params);
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState<VendorFulfillmentStatus | "all">("all");

  const countsQuery = useVendorOrderCounts();
  const ordersQuery = useVendorOrders({
    search: search || undefined,
    fulfillmentStatus,
    page,
    pageSize: PAGE_SIZE,
  });

  const counts = countsQuery.data ?? EMPTY_COUNTS;
  const result = ordersQuery.data;
  const hasActiveFilters = search !== "" || fulfillmentStatus !== "all";

  const clearFilters = () => {
    setSearch("");
    setFulfillmentStatus("all");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <OrderHeader counts={counts} onViewAll={clearFilters} />

      <OrdersToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <OrdersFilters
        fulfillmentStatus={fulfillmentStatus}
        onFulfillmentChange={(v) => {
          setFulfillmentStatus(v);
          setPage(1);
        }}
        counts={counts}
      />

      {ordersQuery.isPending ? (
        <OrderListSkeleton />
      ) : ordersQuery.isError || !result ? (
        <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
          <p className="text-sm font-medium text-error-700">Couldn&apos;t load your orders.</p>
          <button
            type="button"
            onClick={() => ordersQuery.refetch()}
            className="mt-2 text-xs font-semibold text-error-700 underline"
          >
            Try again
          </button>
        </div>
      ) : result.items.length === 0 ? (
        <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
          <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
          <p className="text-sm font-medium text-kampmax-text">No orders found</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">
            {hasActiveFilters
              ? "Try adjusting your search or filters."
              : "Orders from buyers will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <OrdersTable orders={result.items} onView={(o) => router.push(`/vendor/orders/${o.id}`)} />
          </div>
          <div className="md:hidden">
            <OrdersGrid orders={result.items} onView={(o) => router.push(`/vendor/orders/${o.id}`)} />
          </div>

          <OrdersPagination
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
