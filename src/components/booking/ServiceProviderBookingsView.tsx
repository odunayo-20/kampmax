"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  fetchProviderBookingSummary,
  fetchProviderBookings,
  type ProviderBookingSummary,
} from "@/services/booking";
import {
  openingTab,
  PROVIDER_BOOKING_TABS,
  providerBookingsEmpty,
  providerHeadline,
  type MyBookingTab,
} from "@/lib/my-bookings-list";
import { BookingListCard } from "./BookingListCard";
import { BookingEmptyState } from "./BookingEmptyState";
import { BookingFilters } from "./BookingFilters";
import { BookingPagination } from "./BookingPagination";
import type { BookingListQuery, BookingPageResult } from "@/types/booking";

const EMPTY_PAGE: BookingPageResult = { items: [], page: 1, limit: 12, total: 0, totalPages: 1 };

type Filters = Pick<BookingListQuery, "search" | "serviceId" | "providerId" | "dateFrom" | "dateTo" | "sort">;

/** The number on a tab. "All" has none: it would only repeat the sum of the others. */
function tabCount(tab: MyBookingTab, summary: ProviderBookingSummary | null): number {
  if (!summary) return 0;
  switch (tab) {
    case "pending":
      return summary.pending;
    case "upcoming":
      return summary.upcoming;
    case "in_progress":
      return summary.inProgress;
    case "completed":
      return summary.completed;
    case "cancelled":
      return summary.cancelled;
    default:
      return 0;
  }
}

export function ServiceProviderBookingsView() {
  const [picked, setPicked] = useState<MyBookingTab | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({});

  const summaryQuery = useQuery({
    queryKey: ["bookings", "provider", "summary"],
    queryFn: fetchProviderBookingSummary,
    retry: false,
  });
  const summary = summaryQuery.data ?? null;
  const tab = picked ?? openingTab(summary);

  const query: BookingListQuery = useMemo(
    () => ({ status: tab, page, ...filters }),
    [tab, page, filters]
  );

  const listQuery = useQuery({
    queryKey: ["bookings", "provider", query],
    queryFn: () => fetchProviderBookings(query),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const result = listQuery.data ?? EMPTY_PAGE;
  const filtered = Object.values(filters).some(Boolean);
  const empty = providerBookingsEmpty(tab, filtered);
  const headline = providerHeadline(summary);

  // Filters stay when you change tab; only the page starts over.
  function switchTab(next: MyBookingTab) {
    setPicked(next);
    setPage(1);
  }

  function patchFilters(patch: Partial<BookingListQuery>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text">Bookings</h1>
        {headline && <p className="mt-1 text-sm text-kampmax-text-secondary">{headline}</p>}
      </div>

      <div className="flex gap-1 rounded-lg bg-kampmax-muted p-1" role="tablist" aria-label="Booking filters">
        {PROVIDER_BOOKING_TABS.map((t) => {
          const count = tabCount(t.key, summary);
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => switchTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all",
                tab === t.key
                  ? "bg-white text-kampmax-navy shadow-sm"
                  : "text-kampmax-text-secondary hover:text-kampmax-text"
              )}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={cn(
                    "min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold",
                    tab === t.key
                      ? "bg-kampmax-blue text-white"
                      : t.key === "pending"
                        ? "bg-warning-200 text-warning-800"
                        : "bg-kampmax-border text-kampmax-text-secondary"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <BookingFilters role="provider" query={query} onChange={patchFilters} />

      {listQuery.isError && (
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-4 text-center text-sm text-kampmax-text-secondary">
          Couldn&apos;t load your bookings. Check your connection.{" "}
          <button type="button" onClick={() => void listQuery.refetch()} className="font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      )}
      {listQuery.isPending && <p className="py-6 text-center text-sm text-kampmax-text-secondary">Loading your bookings…</p>}

      {listQuery.isPending ? null : result.total === 0 ? (
        <BookingEmptyState title={empty.title} description={empty.text} />
      ) : (
        <>
          <div className="space-y-3">
            {result.items.map((booking) => (
              <BookingListCard
                key={booking.id}
                booking={booking}
                role="provider"
                highlightsPending
              />
            ))}
          </div>
          <BookingPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
