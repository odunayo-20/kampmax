"use client";

import { useQuery } from "@tanstack/react-query";
import { BookingRules, SETTINGS_KEY } from "@/components/service-provider/hours/BookingRules";
import { ServiceCampuses } from "@/components/service-provider/hours/ServiceCampuses";
import { WeeklyHours } from "@/components/service-provider/hours/WeeklyHours";
import { fetchSpBookingSettings } from "@/services/service-provider-dashboard";

/** When customers can book, how they book, and which campuses they find you on. */
export default function AvailabilityPage() {
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchSpBookingSettings, retry: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-kampmax-text">Working hours</h1>

      <WeeklyHours />

      {settings.isPending ? (
        <p className="py-6 text-center text-sm text-kampmax-text-secondary">Loading your settings…</p>
      ) : settings.isError ? (
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-8 text-center text-sm text-kampmax-text-secondary">
          We couldn&apos;t load how customers book.{" "}
          <button type="button" onClick={() => void settings.refetch()} className="font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <>
          <BookingRules initial={settings.data} />
          <ServiceCampuses initial={settings.data} />
        </>
      )}
    </div>
  );
}
