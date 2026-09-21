"use client";

import { useRouter } from "next/navigation";
import { getDashboardOverview } from "@/services/vendor-dashboard";
import { VendorMetricCard } from "./VendorMetricCard";
import { VendorQuickActions } from "./VendorQuickActions";
import { VendorActionRequired } from "./VendorActionRequired";
import { VendorStoreHealth } from "./VendorStoreHealth";
import { VendorRecentOrders } from "./VendorRecentOrders";
import { VendorInventoryAlerts } from "./VendorInventoryAlerts";

export function VendorOverview({ storeSlug }: { storeSlug?: string }) {
  const router = useRouter();
  const overview = getDashboardOverview();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Overview</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">{overview.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {overview.metrics.map((m) => (
          <VendorMetricCard key={m.key} metric={m} />
        ))}
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
