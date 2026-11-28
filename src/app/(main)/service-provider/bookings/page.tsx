"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ServiceProviderBookingsView } from "@/components/booking/ServiceProviderBookingsView";
import { PROVIDER_BOOKING_TABS, type MyBookingTab } from "@/lib/my-bookings-list";

function BookingsContent() {
  const tab = useSearchParams().get("tab");
  const initial = PROVIDER_BOOKING_TABS.some((t) => t.key === tab) ? (tab as MyBookingTab) : null;
  return <ServiceProviderBookingsView initialTab={initial} />;
}

export default function ServiceProviderBookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsContent />
    </Suspense>
  );
}
