"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SpAnalyticsSubnav } from "@/components/service-provider/analytics/SpAnalyticsSubnav";
import { SpAnalyticsSkeleton } from "@/components/service-provider/analytics/SpAnalyticsSkeleton";
import { SpAnalyticsPeriodBar } from "@/components/service-provider/analytics/SpAnalyticsPeriodBar";
import { SpAnalyticsBookingsTable } from "@/components/service-provider/analytics/SpAnalyticsBookingsTable";
import { getSpAnalyticsBookings, getSpAnalyticsBookingsLive } from "@/services/service-provider-analytics";
import { SP_ANALYTICS_PERIOD } from "@/types/service-provider-analytics";
import type { SpAnalyticsBookingsPage, SpAnalyticsBookingsTableRow, SpAnalyticsPeriod } from "@/types/service-provider-analytics";

const DEFAULT_PERIOD: SpAnalyticsPeriod = { key: SP_ANALYTICS_PERIOD.THIRTY_DAYS };

export default function AnalyticsBookingsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<SpAnalyticsPeriod>(DEFAULT_PERIOD);
  const [data, setData] = useState<SpAnalyticsBookingsPage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const liveData = await getSpAnalyticsBookingsLive(period);
      setData(liveData);
    } catch {
      try {
        setData(getSpAnalyticsBookings(period));
      } catch {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) return <SpAnalyticsSkeleton />;
  if (!data) return <div className="text-center py-12 text-kampmax-text-secondary">You don't have access to analytics</div>;

  const handleRowClick = (row: SpAnalyticsBookingsTableRow) => {
    router.push(`/service-provider/bookings/${row.id}`);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Booking analytics</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Volume, value and status of bookings in the selected window
        </p>
      </header>

      <SpAnalyticsSubnav />

      <SpAnalyticsPeriodBar window={data.window} period={period} onPeriodChange={setPeriod} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Bookings" value={String(data.totals.bookings)} />
        <SummaryTile label="Revenue" value={data.totals.revenue} />
        <SummaryTile label="Completed" value={data.totals.completed} />
        <SummaryTile label="Cancelled" value={data.totals.cancelled} />
      </div>

      <section aria-labelledby="analytics-bookings-heading" className="space-y-3">
        <h2 id="analytics-bookings-heading" className="text-lg font-semibold text-kampmax-text">
          Bookings in period
        </h2>
        <SpAnalyticsBookingsTable rows={data.rows} onRowClick={handleRowClick} />
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <p className="text-sm font-medium text-kampmax-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-kampmax-text">{value}</p>
    </div>
  );
}
