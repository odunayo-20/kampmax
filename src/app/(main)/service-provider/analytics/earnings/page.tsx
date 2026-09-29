"use client";

import { useEffect, useState, useCallback } from "react";
import { SpAnalyticsSubnav } from "@/components/service-provider/analytics/SpAnalyticsSubnav";
import { SpAnalyticsSkeleton } from "@/components/service-provider/analytics/SpAnalyticsSkeleton";
import { SpAnalyticsPeriodBar } from "@/components/service-provider/analytics/SpAnalyticsPeriodBar";
import { SpAnalyticsKpiCards } from "@/components/service-provider/analytics/SpAnalyticsKpiCards";
import { SpAnalyticsTrendChart } from "@/components/service-provider/analytics/SpAnalyticsTrendChart";
import { SpAnalyticsCategoryChart } from "@/components/service-provider/analytics/SpAnalyticsCategoryChart";
import { getSpAnalyticsEarnings, getSpAnalyticsEarningsLive } from "@/services/service-provider-analytics";
import { SP_ANALYTICS_PERIOD } from "@/types/service-provider-analytics";
import type { SpAnalyticsEarnings, SpAnalyticsPeriod } from "@/types/service-provider-analytics";

const DEFAULT_PERIOD: SpAnalyticsPeriod = { key: SP_ANALYTICS_PERIOD.THIRTY_DAYS };

export default function AnalyticsEarningsPage() {
  const [period, setPeriod] = useState<SpAnalyticsPeriod>(DEFAULT_PERIOD);
  const [data, setData] = useState<SpAnalyticsEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const liveData = await getSpAnalyticsEarningsLive(period);
      setData(liveData);
    } catch {
      try {
        setData(getSpAnalyticsEarnings(period));
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Earnings analytics</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Revenue, value and customer insights for your services
        </p>
      </header>

      <SpAnalyticsSubnav />

      <SpAnalyticsPeriodBar window={data.window} period={period} onPeriodChange={setPeriod} />

      <SpAnalyticsKpiCards kpis={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SpAnalyticsTrendChart trend={data.trend} metric="revenue" />
        <SpAnalyticsCategoryChart categories={data.categories} />
      </div>

      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <h3 className="text-sm font-semibold text-kampmax-text">Top services by revenue</h3>
        {data.services.length === 0 ? (
          <p className="py-8 text-center text-sm text-kampmax-text-secondary">No services with revenue in this period</p>
        ) : (
          <ul className="mt-3 divide-y divide-kampmax-border">
            {data.services.map((s) => (
              <li key={s.serviceId} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-kampmax-text">{s.serviceName}</p>
                  <p className="text-xs text-kampmax-text-secondary">{s.bookings} booking{s.bookings === 1 ? "" : "s"}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-kampmax-text">{s.revenue}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
