"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { fetchCustomerBookings, fetchProviderBookings } from "@/services/booking";
import type { BookingListQuery, BookingSort } from "@/types/booking";

const SORT_OPTIONS: { value: BookingSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "upcoming", label: "Soonest first" },
  { value: "recently_completed", label: "Recently completed" },
];

/**
 * Order-list filter bar (search, service, provider, date window, sort). All
 * filtering/pagination is applied by the backend store; this toolbar only
 * emits query changes.
 */
export function BookingFilters({
  role,
  query,
  onChange,
}: {
  role: "customer" | "provider";
  query: BookingListQuery;
  onChange: (patch: Partial<BookingListQuery>) => void;
}) {
  // The service list is made from the bookings you actually have.
  const known = useQuery({
    queryKey: ["bookings", role, "filter-options"],
    queryFn: () => (role === "customer" ? fetchCustomerBookings({ limit: 100 }) : fetchProviderBookings({ limit: 100 })),
    staleTime: 60_000,
    retry: false,
  });
  const services = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of known.data?.items ?? []) seen.set(b.serviceId, b.serviceName);
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((x, y) => x.label.localeCompare(y.label));
  }, [known.data]);

  const hasActive =
    !!query.search ||
    !!query.serviceId ||
    !!query.dateFrom ||
    !!query.dateTo ||
    (query.sort && query.sort !== "newest");

  return (
    <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Search bookings</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            value={query.search ?? ""}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search service, reference, name…"
            className="w-full rounded-lg border border-neutral-200 py-2 pl-8 pr-2 text-xs focus:border-primary-400 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="sr-only">Filter by service</span>
          <select
            value={query.serviceId ?? ""}
            onChange={(e) => onChange({ serviceId: e.target.value || undefined })}
            className="w-full rounded-lg border border-neutral-200 py-2 pl-2 pr-2 text-xs focus:border-primary-400 focus:outline-none"
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5">
          <label className="block min-w-0 flex-1">
            <span className="sr-only">From date</span>
            <input
              type="date"
              value={query.dateFrom ?? ""}
              onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
              className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-xs focus:border-primary-400 focus:outline-none"
            />
          </label>
          <span className="text-[11px] text-neutral-400">to</span>
          <label className="block min-w-0 flex-1">
            <span className="sr-only">To date</span>
            <input
              type="date"
              value={query.dateTo ?? ""}
              onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
              className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-xs focus:border-primary-400 focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="sr-only">Sort</span>
          <select
            value={query.sort ?? "newest"}
            onChange={(e) => onChange({ sort: e.target.value as BookingSort })}
            className="w-full rounded-lg border border-neutral-200 py-2 pl-2 pr-2 text-xs focus:border-primary-400 focus:outline-none"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasActive && (
        <button
          onClick={() =>
            onChange({ search: undefined, serviceId: undefined, providerId: undefined, dateFrom: undefined, dateTo: undefined, sort: undefined })
          }
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700"
        >
          <SlidersHorizontal className="h-3 w-3" aria-hidden />
          Clear filters
        </button>
      )}
    </div>
  );
}