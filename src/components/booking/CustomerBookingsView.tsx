"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  fetchCustomerBookingsLive,
  getCustomerBookingCounts,
  getCustomerBookings,
} from "@/services/booking";
import { BookingListCard } from "./BookingListCard";
import { BookingEmptyState } from "./BookingEmptyState";
import { BookingFilters } from "./BookingFilters";
import { BookingPagination } from "./BookingPagination";
import type { BookingListFilter, BookingListQuery, BookingPageResult } from "@/types/booking";

const TABS: { key: BookingListFilter; label: string }[] = [
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

const isActiveTab = (t: BookingListFilter): t is Exclude<BookingListFilter, "past"> =>
  t !== "past";

/** Customer booking dashboard (auth-gated by the (main) layout). */
export function CustomerBookingsView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<BookingListFilter>("upcoming");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [liveResult, setLiveResult] = useState<BookingPageResult | null>(null);

  const userId = user?.id ?? "u1";

  const query: BookingListQuery = useMemo(
    () => ({ status: tab, page, ...filters }),
    [tab, page, filters]
  );

  const localResult = useMemo(() => getCustomerBookings(query), [query, userId]);
  const counts = useMemo(() => getCustomerBookingCounts(), [userId]);

  useEffect(() => {
    let cancelled = false;
    fetchCustomerBookingsLive(query)
      .then((res) => {
        if (!cancelled && (res.items.length > 0 || localResult.items.length === 0)) {
          setLiveResult(res);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [query, localResult.items.length]);

  const result = liveResult || localResult;

  function switchTab(next: BookingListFilter) {
    if (!isActiveTab(next)) return;
    setTab(next);
    setPage(1);
    setFilters(EMPTY_FILTERS);
  }

  function patchFilters(patch: Partial<BookingListQuery>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-kampmax-text">My Bookings</h1>
            <p className="mt-0.5 text-xs text-kampmax-text-secondary">
              Your service appointments across Kampmax.
            </p>
          </div>
          <Link
            href="/services"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" aria-hidden /> Book a service
          </Link>
        </div>

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
              {counts[t.key] > 0 && (
                <span
                  className={cn(
                    "min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold",
                    tab === t.key ? "bg-kampmax-blue text-white" : "bg-kampmax-border text-kampmax-text-secondary"
                  )}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <BookingFilters role="customer" query={query} onChange={patchFilters} />

        {result.total === 0 ? (
          tab === "upcoming" ? (
            <BookingEmptyState
              title="No upcoming bookings"
              description="Book a service and your appointments will show up here."
              ctaHref="/services"
              ctaLabel="Browse services"
            />
          ) : (
            <BookingEmptyState
              title={`No ${tab} bookings yet`}
              description="Bookings in this section will appear here."
            />
          )
        ) : (
          <>
            <div className="space-y-3">
              {result.items.map((booking) => (
                <BookingListCard key={booking.id} booking={booking} role="customer" />
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
    </PageContainer>
  );
}