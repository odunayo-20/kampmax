"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SpAnalyticsSubnav } from "@/components/service-provider/analytics/SpAnalyticsSubnav";
import { SpAnalyticsSkeleton } from "@/components/service-provider/analytics/SpAnalyticsSkeleton";
import { SpAnalyticsPeriodBar } from "@/components/service-provider/analytics/SpAnalyticsPeriodBar";
import { SpAnalyticsKpiCards } from "@/components/service-provider/analytics/SpAnalyticsKpiCards";
import { SpAnalyticsStatusDonut } from "@/components/service-provider/analytics/SpAnalyticsStatusDonut";
import { SpAnalyticsTrendChart } from "@/components/service-provider/analytics/SpAnalyticsTrendChart";
import { SpAnalyticsCategoryChart } from "@/components/service-provider/analytics/SpAnalyticsCategoryChart";
import { SpAnalyticsFunnelCard } from "@/components/service-provider/analytics/SpAnalyticsFunnelCard";
import { SpAnalyticsPeakDayCard } from "@/components/service-provider/analytics/SpAnalyticsPeakDayCard";
import { getSpAnalyticsOverviewLive } from "@/services/service-provider-analytics";
import { SP_ANALYTICS_PERIOD } from "@/types/service-provider-analytics";
import type { SpAnalyticsOverview, SpAnalyticsPeriod } from "@/types/service-provider-analytics";

const DEFAULT_PERIOD: SpAnalyticsPeriod = { key: SP_ANALYTICS_PERIOD.THIRTY_DAYS };

export default function AnalyticsOverviewPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<SpAnalyticsPeriod>(DEFAULT_PERIOD);
  const [overview, setOverview] = useState<SpAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSpAnalyticsOverviewLive(period);
      setOverview(data);
      setError(null);
    } catch {
      setError("We couldn't load your analytics.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading && !overview) return <SpAnalyticsSkeleton />;
  if (error && !overview) return (
      <div role="alert" className="py-12 text-center text-kampmax-text-secondary">
        {error}{" "}
        <button type="button" onClick={() => void fetchOverview()} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  if (!overview) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Analytics</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Understand demand, performance and seasonality for your services
        </p>
      </header>

      <SpAnalyticsSubnav />

      <SpAnalyticsPeriodBar window={overview.window} period={period} onPeriodChange={setPeriod} />

      <SpAnalyticsKpiCards kpis={overview.kpis} />

      <div className="grid gap-4 lg:grid-cols-3">
        <SpAnalyticsTrendChart trend={overview.trend} metric="revenue" />
        <SpAnalyticsStatusDonut status={overview.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpAnalyticsCategoryChart categories={overview.categories} />
        </div>
        <SpAnalyticsPeakDayCard peakDay={overview.peakDay} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpAnalyticsFunnelCard funnel={overview.funnel} />
        <div className="rounded-xl border border-kampmax-border bg-white p-4">
          <h3 className="text-sm font-semibold text-kampmax-text">Explore deeper</h3>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Drill into individual bookings or your earnings breakdown for this window.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/service-provider/analytics/bookings")}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              View bookings
            </button>
            <button
              onClick={() => router.push("/service-provider/analytics/earnings")}
              className="rounded-lg border border-kampmax-border px-4 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
            >
              View earnings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
