"use client";

import { VendorOverview } from "@/components/vendor-dashboard/VendorOverview";

// Access is already enforced by app/(main)/vendor/layout.tsx (backend-driven
// via getVendorDashboardAccessApi) — this page only ever mounts once that
// gate has approved the request, so it renders the overview directly rather
// than re-checking a second, potentially-inconsistent access source.
export default function VendorDashboardPage() {
  return <VendorOverview />;
}