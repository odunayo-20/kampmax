"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  fetchOrders,
  getOrdersByUser,
  getActiveOrders,
  getCompletedOrders,
  getCancelledOrders,
} from "@/services/orders";
import { Order } from "@/types";
import { getVendorById } from "@/services/users";
import { PageContainer } from "@/components/layout/PageContainer";
import { OrderCard } from "@/components/orders/OrderCard";
import { Button } from "@/components/ui";
import { matchesOrder, ordersHeadline } from "@/lib/buyer-orders";
import { EmptyOrdersState } from "@/components/orders/EmptyOrdersState";
import { cn } from "@/lib/utils";

type TabKey = "all" | "active" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const { user, status } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [liveOrders, setLiveOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Which page of orders is loaded, so older ones can be asked for.
  const [paging, setPaging] = useState({ page: 1, totalPages: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  const userId = user?.id || "u1";

  useEffect(() => {
    let mounted = true;
    if (status === "authenticated") {
      setIsLoading(true);
      fetchOrders().then(({ data, page, totalPages }) => {
        if (mounted) {
          setLiveOrders(data);
          setPaging({ page, totalPages });
          setIsLoading(false);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [status]);

  const hasMore = paging.page < paging.totalPages;

  async function loadOlder() {
    setLoadingMore(true);
    setMoreFailed(false);
    const res = await fetchOrders({ page: paging.page + 1 });
    if (res.error) {
      setMoreFailed(true);
    } else {
      setLiveOrders((prev) => [...(prev ?? []), ...res.data.filter((o) => !(prev ?? []).some((p) => p.id === o.id))]);
      setPaging({ page: res.page, totalPages: res.totalPages });
    }
    setLoadingMore(false);
  }

  const allUserOrders = useMemo(() => {
    return liveOrders || getOrdersByUser(userId);
  }, [liveOrders, userId]);

  const orders = useMemo(() => {
    switch (activeTab) {
      case "active":
        return allUserOrders.filter(
          (o) =>
            o.status === "placed" ||
            o.status === "confirmed" ||
            o.status === "preparing" ||
            o.status === "ready" ||
            o.status === "out_for_delivery"
        );
      case "completed":
        return allUserOrders.filter((o) => o.status === "delivered");
      case "cancelled":
        return allUserOrders.filter((o) => o.status === "cancelled");
      default:
        return allUserOrders;
    }
  }, [activeTab, allUserOrders]);

  const filteredOrders = useMemo(
    () => (searchQuery.trim() ? orders.filter((o) => matchesOrder(o, searchQuery)) : orders),
    [orders, searchQuery]
  );

  const headline = useMemo(() => ordersHeadline(allUserOrders.map((o) => o.status)), [allUserOrders]);

  const tabCounts = useMemo(() => ({
    all: allUserOrders.length,
    active: allUserOrders.filter(
      (o) =>
        o.status === "placed" ||
        o.status === "confirmed" ||
        o.status === "preparing" ||
        o.status === "ready" ||
        o.status === "out_for_delivery"
    ).length,
    completed: allUserOrders.filter((o) => o.status === "delivered").length,
    cancelled: allUserOrders.filter((o) => o.status === "cancelled").length,
  }), [allUserOrders]);

  // Vendor name cache
  const vendorCache = useMemo(() => {
    const cache: Record<string, string> = {};
    orders.forEach((o) => {
      if (!cache[o.vendorId]) {
        const v = getVendorById(o.vendorId);
        cache[o.vendorId] = o.vendorName || v?.storeName || "Unknown store";
      }
    });
    return cache;
  }, [orders]);

  return (
    <PageContainer>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-kampmax-text">My Orders</h1>
            <p className="text-xs text-kampmax-text-secondary mt-0.5">
              Track and manage your orders
            </p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-kampmax-text-secondary bg-kampmax-muted px-2.5 py-1 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-kampmax-blue" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {headline && (
          <p role="status" className="rounded-lg bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700">
            {headline}
          </p>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kampmax-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number, seller or product..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue placeholder:text-kampmax-text-secondary"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-kampmax-muted rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all",
                activeTab === tab.key
                  ? "bg-white text-kampmax-navy shadow-sm"
                  : "text-kampmax-text-secondary hover:text-kampmax-text"
              )}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                    activeTab === tab.key
                      ? "bg-kampmax-blue text-white"
                      : "bg-kampmax-border text-kampmax-text-secondary"
                  )}
                >
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {filteredOrders.length === 0 ? (
          searchQuery ? (
            <EmptyOrdersState type="search" searchQuery={searchQuery} />
          ) : (
            <EmptyOrdersState type={activeTab} />
          )
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                vendorName={vendorCache[order.vendorId]}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex flex-col items-center gap-2 pt-2">
            {searchQuery.trim() && (
              <p className="text-xs text-kampmax-text-secondary">Only the orders loaded so far are searched.</p>
            )}
            {moreFailed && (
              <p role="alert" className="text-xs text-kampmax-error">
                Couldn&apos;t load older orders. Try again.
              </p>
            )}
            <Button variant="outline" onClick={loadOlder} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load older orders"}
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
