"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  MapPin,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  Calendar,
  AlertCircle,
  Building2,
} from "lucide-react";
import {
  fetchVendorAnalytics,
  fetchVendorOrderStatusCounts,
  fetchVendorEarningsAnalytics,
  fetchVendorProductsAnalytics,
  fetchVendorCampusOrdersAnalytics,
  fetchVendorSalesAnalytics,
} from "@/services/vendor-dashboard-api";
import { formatNaira } from "@/lib/utils";

export default function VendorAnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [statusCounts, setStatusCounts] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [productInsights, setProductInsights] = useState<any[]>([]);
  const [campusDistribution, setCampusDistribution] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [
        overviewRes,
        statusRes,
        earningsRes,
        productsRes,
        campusRes,
        salesRes,
      ] = await Promise.all([
        fetchVendorAnalytics().catch(() => null),
        fetchVendorOrderStatusCounts().catch(() => []),
        fetchVendorEarningsAnalytics().catch(() => null),
        fetchVendorProductsAnalytics().catch(() => []),
        fetchVendorCampusOrdersAnalytics().catch(() => []),
        fetchVendorSalesAnalytics(period).catch(() => null),
      ]);

      setOverview(overviewRes);
      setStatusCounts(Array.isArray(statusRes) ? statusRes : []);
      setEarnings(earningsRes);
      setProductInsights(Array.isArray(productsRes) ? productsRes : productsRes?.items || []);
      setCampusDistribution(Array.isArray(campusRes) ? campusRes : []);
      setSalesTrend(salesRes);
    } catch (err: any) {
      setError("Unable to load latest analytics. Showing cached insights.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [period]);

  const totalDelivered = Number(earnings?.deliveredOrderValue || overview?.overview?.totalRevenue || 0);
  const totalOrders = Number(overview?.overview?.totalOrders || 0);
  const completedOrders = Number(overview?.overview?.completedOrders || 0);
  const activeProducts = Number(overview?.overview?.activeProducts || 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalDelivered / Math.max(completedOrders, 1)) : 0;
  const fulfillmentRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-kampmax-text">Store Analytics & Insights</h1>
          <p className="mt-0.5 text-sm text-kampmax-text-secondary">
            Track revenue performance, order fulfillment, and campus market share.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="inline-flex rounded-lg border border-kampmax-border bg-white p-1 text-xs font-semibold shadow-sm">
            {(["7d", "30d", "90d", "all"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  period === p
                    ? "bg-primary-600 text-white"
                    : "text-kampmax-text-secondary hover:text-kampmax-text hover:bg-neutral-50"
                }`}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : p === "90d" ? "90 Days" : "All Time"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3 py-1.5 text-xs font-semibold text-kampmax-text hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-kampmax-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-kampmax-text-secondary">Delivered Earnings</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-kampmax-text">{formatNaira(totalDelivered)}</p>
              <p className="mt-1 flex items-center text-xs text-emerald-600">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                <span>Settled directly to wallet</span>
              </p>
            </div>

            <div className="rounded-xl border border-kampmax-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-kampmax-text-secondary">Total Orders</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <ShoppingBag className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-kampmax-text">{totalOrders}</p>
              <p className="mt-1 text-xs text-kampmax-text-secondary">
                {completedOrders} completed ({fulfillmentRate}%)
              </p>
            </div>

            <div className="rounded-xl border border-kampmax-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-kampmax-text-secondary">Average Order Value</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-kampmax-text">{formatNaira(avgOrderValue)}</p>
              <p className="mt-1 text-xs text-kampmax-text-secondary">Per fulfilled checkout</p>
            </div>

            <div className="rounded-xl border border-kampmax-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-kampmax-text-secondary">Active Catalog</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Package className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-kampmax-text">{activeProducts}</p>
              <p className="mt-1 text-xs text-kampmax-text-secondary">Published and listed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Order Status Breakdown */}
            <div className="rounded-xl border border-kampmax-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-kampmax-border pb-3">
                <h3 className="text-sm font-bold text-kampmax-text flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary-600" /> Order Status Distribution
                </h3>
                <span className="text-xs text-kampmax-text-secondary">
                  {statusCounts.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0)} Total
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {statusCounts.length === 0 ? (
                  <p className="text-xs text-kampmax-text-secondary text-center py-6">
                    No order status records yet.
                  </p>
                ) : (
                  statusCounts.map((item) => {
                    const count = Number(item.count) || 0;
                    const total = Math.max(1, statusCounts.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0));
                    const pct = Math.round((count / total) * 100);

                    const colorClass =
                      item.status === "DELIVERED"
                        ? "bg-emerald-500"
                        : item.status === "PROCESSING"
                        ? "bg-blue-500"
                        : item.status === "PENDING"
                        ? "bg-amber-500"
                        : "bg-neutral-400";

                    return (
                      <div key={item.status} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-kampmax-text">{item.status}</span>
                          <span className="text-kampmax-text-secondary">
                            {count} orders ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                          <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Campus Geographic Distribution */}
            <div className="rounded-xl border border-kampmax-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-kampmax-border pb-3">
                <h3 className="text-sm font-bold text-kampmax-text flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary-600" /> Campus Market Share
                </h3>
                <span className="text-xs text-kampmax-text-secondary">By delivery location</span>
              </div>

              <div className="mt-4 space-y-3">
                {campusDistribution.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-8 w-8 text-neutral-300 mx-auto" />
                    <p className="mt-2 text-xs text-kampmax-text-secondary">
                      Campus delivery distribution will populate as orders are completed.
                    </p>
                  </div>
                ) : (
                  campusDistribution.map((campus: any) => (
                    <div key={campus.campusId || campus.campusName} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50/75 border border-kampmax-border">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-100 text-primary-700 text-xs font-bold">
                          <MapPin className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-kampmax-text">{campus.campusName || "Main Campus"}</p>
                          <p className="text-[10px] text-kampmax-text-secondary">{campus.orderCount || 0} orders placed</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-kampmax-text">
                        {formatNaira(campus.totalRevenue || 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Product Performance Section */}
          <div className="rounded-xl border border-kampmax-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-kampmax-border p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-kampmax-text flex items-center gap-2">
                <Package className="h-4 w-4 text-primary-600" /> Top Performing Products
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50/75 border-b border-kampmax-border text-xs font-semibold text-kampmax-text-secondary">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Units Sold</th>
                    <th className="px-4 py-3">Revenue Generated</th>
                    <th className="px-4 py-3">Stock Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kampmax-border text-xs">
                  {productInsights.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-kampmax-text-secondary">
                        No product sales recorded yet. Products will appear here once orders are placed.
                      </td>
                    </tr>
                  ) : (
                    productInsights.slice(0, 10).map((prod: any, idx: number) => (
                      <tr key={prod.id || idx} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-kampmax-text">
                          {prod.title || prod.name || "Product Item"}
                        </td>
                        <td className="px-4 py-3 text-kampmax-text-secondary">
                          {formatNaira(prod.price || 0)}
                        </td>
                        <td className="px-4 py-3 font-medium text-kampmax-text">
                          {prod.unitsSold || prod.soldCount || 0}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600">
                          {formatNaira((prod.unitsSold || prod.soldCount || 0) * (prod.price || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              (prod.stockQuantity ?? prod.stock ?? 10) > 5
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {(prod.stockQuantity ?? prod.stock ?? 10)} in stock
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}