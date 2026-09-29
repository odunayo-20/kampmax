"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  fetchProviderBookingSummaryLive,
  fetchProviderBookingsLive,
  getProviderBookingSummary,
  getProviderBookings,
  type ProviderBookingFilter,
} from "@/services/booking";
import { BookingListCard } from "./BookingListCard";
import { BookingEmptyState } from "./BookingEmptyState";
import { BookingFilters } from "./BookingFilters";
import { BookingPagination } from "./BookingPagination";
import type { BookingListQuery, BookingPageResult } from "@/types/booking";

const TABS: { key: ProviderBookingFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "upcoming", label: "Upcoming" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

const EMPTY_FILTERS: Pick<
  BookingListQuery,
  "search" | "serviceId" | "providerId" | "dateFrom" | "dateTo" | "sort"
> = {};

export function ServiceProviderBookingsView() {
  const [tab, setTab] = useState<ProviderBookingFilter>("pending");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const query: BookingListQuery = useMemo(
    () => ({ status: tab, page, ...filters }),
    [tab, page, filters]
  );

  const localResult = useMemo(() => getProviderBookings(query), [query]);
  const localSummary = useMemo(() => getProviderBookingSummary(), []);

  const [liveResult, setLiveResult] = useState<BookingPageResult | null>(null);
  const [liveSummary, setLiveSummary] = useState<ReturnType<typeof getProviderBookingSummary> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProviderBookingsLive(query)
      .then((res) => {
        if (!cancelled) setLiveResult(res);
      })
      .catch(() => {});

    fetchProviderBookingSummaryLive()
      .then((res) => {
        if (!cancelled) setLiveSummary(res);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [query]);

  const result = liveResult ?? localResult;
  const summary = liveSummary ?? localSummary;

  function switchTab(next: ProviderBookingFilter) {
    setTab(next);
    setPage(1);
    setFilters(EMPTY_FILTERS);
  }

  function patchFilters(patch: Partial<BookingListQuery>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text">Bookings</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          {summary && summary.pending > 0
            ? `${summary.pending} request${summary.pending !== 1 ? "s" : ""} awaiting your response.`
            : "Appointments requested through your service listings."}
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-warning-200 bg-warning-50 p-3">
            <p className="text-xs font-semibold text-warning-700">Pending</p>
            <p className="mt-0.5 text-xl font-bold text-warning-800">{summary.pending}</p>
          </div>
          <div className="rounded-xl border border-kampmax-border bg-white p-3">
            <p className="text-xs font-semibold text-kampmax-text-secondary">Upcoming today</p>
            <p className="mt-0.5 text-xl font-bold text-kampmax-text">{summary.upcomingToday}</p>
          </div>
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
            <p className="text-xs font-semibold text-primary-700">In progress</p>
            <p className="mt-0.5 text-xl font-bold text-primary-800">{summary.inProgress}</p>
          </div>
          <div className="rounded-xl border border-success-200 bg-success-50 p-3">
            <p className="text-xs font-semibold text-success-700">Completed</p>
            <p className="mt-0.5 text-xl font-bold text-success-800">{summary.completed}</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-kampmax-muted p-1" role="tablist" aria-label="Booking filters">
        {TABS.map((t) => (
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
            {pendingCountKey(t.key, summary, result) > 0 && (
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
                {pendingCountKey(t.key, summary, result)}
              </span>
            )}
          </button>
        ))}
      </div>

      <BookingFilters role="provider" query={query} onChange={patchFilters} />

      {result.total === 0 ? (
        tab === "pending" ? (
          <BookingEmptyState
            title="No pending requests"
            description="When a customer asks to book one of your services, the request shows up here."
          />
        ) : tab === "upcoming" ? (
          <BookingEmptyState
            title="No upcoming bookings"
            description="Confirmed appointments for you and your customer appear here."
          />
        ) : (
          <BookingEmptyState
            title={`No ${tab} bookings`}
            description="Nothing here yet."
          />
        )
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

function pendingCountKey(
  key: ProviderBookingFilter,
  summary: ReturnType<typeof getProviderBookingSummary>,
  _result: { total: number }
): number {
  if (key === "pending") return summary?.pending ?? 0;
  if (key === "upcoming") return summary?.upcoming ?? 0;
  if (key === "in_progress") return summary?.inProgress ?? 0;
  if (key === "completed") return summary?.completed ?? 0;
  if (key === "cancelled") return summary?.cancelled ?? 0;
  return _result.total;
}