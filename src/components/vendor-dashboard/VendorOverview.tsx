"use client";

import { useRouter } from "next/navigation";
import { useVendorOverview } from "@/hooks/use-vendor-dashboard";
import { VendorMetricCard } from "./VendorMetricCard";
import { VendorQuickActions } from "./VendorQuickActions";
import { VendorActionRequired } from "./VendorActionRequired";
import { VendorStoreHealth } from "./VendorStoreHealth";
import { VendorRecentOrders } from "./VendorRecentOrders";
import { VendorInventoryAlerts } from "./VendorInventoryAlerts";

export function VendorOverview({ storeSlug }: { storeSlug?: string }) {
  const router = useRouter();
  const { data: overview, isPending, isError, refetch } = useVendorOverview();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Overview</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">
          {overview?.summary ?? (isError ? "We couldn't load your store metrics." : "Loading your store…")}
        </p>
      </div>

      {isError && (
        <div className="flex items-center justify-between rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700">
          <span>Couldn&apos;t load metrics from the server.</span>
          <button type="button" onClick={() => refetch()} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isPending
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
            ))
          : overview?.metrics.map((m) => <VendorMetricCard key={m.key} metric={m} />)}
      </div>

      {/* Inventory Low Stock Alert */}
      <VendorInventoryAlerts />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <VendorActionRequired />
          <VendorRecentOrders />
        </div>
        <div className="space-y-4">
          <VendorQuickActions storeSlug={storeSlug} onNavigate={(href) => router.push(href)} />
          <VendorStoreHealth />
        </div>
      </div>
    </div>
  );
}
