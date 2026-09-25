"use client";

import { useState } from "react";
import { PayoutAccountCard } from "@/components/vendor-financials/PayoutAccountCard";
import { PayoutsTable } from "@/components/vendor-financials/PayoutsTable";
import { PayoutRequestModal } from "@/components/vendor-financials/PayoutRequestModal";
import { VendorPagination } from "@/components/vendor-shared/VendorPagination";
import { FinancialsSkeleton } from "@/components/vendor-financials/FinancialsSkeleton";
import { useFinancialOverview, usePayouts, useRequestPayout } from "@/hooks/use-vendor-financials";
import type { PayoutRequestInput, PayoutRequestResult, VendorPayoutStatus } from "@/types/vendor-financials";

const DEFAULT_PAGE_SIZE = 10;

export default function PayoutsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<VendorPayoutStatus | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);

  const payoutsQuery = usePayouts({ page, pageSize: DEFAULT_PAGE_SIZE, status: statusFilter });
  const overviewQuery = useFinancialOverview();
  const requestPayout = useRequestPayout();

  const data = payoutsQuery.data;
  const account = overviewQuery.data?.account ?? null;
  const available = overviewQuery.data?.available ?? 0;
  const loading = payoutsQuery.isPending || overviewQuery.isPending;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleStatusChange = (newStatus: VendorPayoutStatus | "all") => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleRequestPayout = () => {
    setModalOpen(true);
  };

  const handleModalSubmit = async (input: PayoutRequestInput): Promise<PayoutRequestResult> => {
    const res = await requestPayout.mutateAsync(input);
    if (res.ok) setModalOpen(false);
    return res;
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  if (loading) return <FinancialsSkeleton />;
  if (payoutsQuery.isError || !data || !account) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-center">
        <p className="text-sm font-medium text-error-700">Couldn&apos;t load your payouts.</p>
        <button type="button" onClick={() => payoutsQuery.refetch()} className="mt-2 text-xs font-semibold text-error-700 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Payouts</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Request payouts and view payout history
          </p>
        </div>
      </header>

      <PayoutAccountCard
        account={account}
        onRequestPayout={handleRequestPayout}
        canRequest={account?.status === "verified"}
      />

      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-kampmax-text-secondary">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as VendorPayoutStatus | "all")}
            className="h-10 px-3 text-sm bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600/20"
          >
            <option value="all">All statuses</option>
            <option value="processing">Processing</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <PayoutsTable items={data.items} onRowClick={(p) => { /* could open detail */ }} />

      <VendorPagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={data.pageSize}
        itemLabel="payouts"
        onPageChange={handlePageChange}
      />

      <PayoutRequestModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        available={available}
      />
    </div>
  );
}