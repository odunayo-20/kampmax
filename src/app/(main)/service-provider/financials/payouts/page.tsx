"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SpFinancialsSubnav } from "@/components/service-provider/financials/SpFinancialsSubnav";
import { SpPayoutAccountCard } from "@/components/service-provider/financials/SpPayoutAccountCard";
import { SpPayoutsTable } from "@/components/service-provider/financials/SpPayoutsTable";
import { SpPayoutRequestModal } from "@/components/service-provider/financials/SpPayoutRequestModal";
import { SpPagination } from "@/components/service-provider/financials/SpPagination";
import { SpFinancialsSkeleton } from "@/components/service-provider/financials/SpFinancialsSkeleton";
import {
  getPayouts,
  getPayoutsLive,
  getPayoutAccount,
  getPayoutAccountLive,
  requestPayout,
  requestPayoutLive,
  computeAvailable,
  computeAvailableLive,
} from "@/services/service-provider-financials";
import type { SpPayout, SpPayoutStatus, SpPayoutAccount, SpPayoutRequestInput, SpPayoutRequestResult, SpFinancialPage } from "@/types/service-provider-financials";

const DEFAULT_PAGE_SIZE = 10;

export default function PayoutsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<SpPayoutStatus | "all">("all");
  const [data, setData] = useState<SpFinancialPage<SpPayout> | null>(null);
  const [account, setAccount] = useState<SpPayoutAccount | null>(null);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const payoutsRes = await getPayoutsLive({ page, pageSize, status: statusFilter });
      setData(payoutsRes);
    } catch {
      try {
        const payoutsRes = getPayouts({ page, pageSize, status: statusFilter });
        setData(payoutsRes);
      } catch {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  const fetchMeta = useCallback(async () => {
    try {
      const [acct, avail] = await Promise.all([
        getPayoutAccountLive(),
        computeAvailableLive(),
      ]);
      setAccount(acct);
      setAvailable(avail);
    } catch {
      try {
        const [acct, avail] = [getPayoutAccount(), computeAvailable()];
        setAccount(acct);
        setAvailable(avail);
      } catch {
        setAccount(null);
        setAvailable(0);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMeta();
  }, [fetchData, fetchMeta]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleStatusChange = (newStatus: SpPayoutStatus | "all") => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleRequestPayout = () => {
    setModalOpen(true);
  };

  const handleModalSubmit = async (input: SpPayoutRequestInput): Promise<SpPayoutRequestResult> => {
    try {
      const res = await requestPayoutLive(input);
      if (res.ok) {
        fetchData();
        fetchMeta();
      }
      return res;
    } catch {
      const res = requestPayout(input);
      if (res.ok) {
        fetchData();
        fetchMeta();
      }
      return res;
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  if (loading) return <SpFinancialsSkeleton />;
  if (!data) return <div className="text-center py-12 text-kampmax-text-secondary">No access</div>;

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

      <SpFinancialsSubnav />

      <SpPayoutAccountCard
        account={account ?? { bankName: "", bankCode: "", accountName: "", maskedAccountNumber: "••••••••••", status: "missing", currency: "NGN", restrictions: [] }}
        onRequestPayout={handleRequestPayout}
        canRequest={account?.status === "verified"}
      />

      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-kampmax-text-secondary">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as SpPayoutStatus | "all")}
            className="h-10 px-3 text-sm bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600/20"
          >
            <option value="all">All statuses</option>
            <option value="processing">Processing</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <SpPayoutsTable
        items={data.items}
        onRowClick={(p) => router.push(`/service-provider/financials/payouts/${p.id}`)}
      />

      <SpPagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={data.pageSize}
        itemLabel="payouts"
        onPageChange={handlePageChange}
      />

      <SpPayoutRequestModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        account={account ?? { bankName: "", bankCode: "", accountName: "", maskedAccountNumber: "••••••••••", status: "missing", currency: "NGN", restrictions: [] }}
        available={available}
      />
    </div>
  );
}