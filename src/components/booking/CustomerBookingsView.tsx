"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { PageContainer } from "@/components/layout/PageContainer";
import { fetchCustomerBookingCounts, fetchCustomerBookings } from "@/services/booking";
import { BookingListCard } from "./BookingListCard";
import { BookingEmptyState } from "./BookingEmptyState";
import { BookingFilters } from "./BookingFilters";
import { BookingPagination } from "./BookingPagination";
import { MY_BOOKING_TABS, myBookingsEmpty, type MyBookingTab } from "@/lib/my-bookings-list";
import type { BookingListQuery, BookingPageResult } from "@/types/booking";

const EMPTY_PAGE: BookingPageResult = { items: [], page: 1, limit: 12, total: 0, totalPages: 1 };

const EMPTY_FILTERS: Pick<
  BookingListQuery,
  "search" | "serviceId" | "providerId" | "dateFrom" | "dateTo" | "sort"
> = {};

/** Customer booking dashboard (auth-gated by the (main) layout). */
export function CustomerBookingsView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<MyBookingTab>("upcoming");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const userId = user?.id ?? "";

  const query: BookingListQuery = useMemo(
    () => ({ status: tab, page, ...filters }),
    [tab, page, filters]
  );

  const listQuery = useQuery({
    queryKey: ["bookings", "customer", query],
    queryFn: () => fetchCustomerBookings(query),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const result = listQuery.data ?? EMPTY_PAGE;
  const countsQuery = useQuery({
    queryKey: ["bookings", "customer", "counts", userId],
    queryFn: fetchCustomerBookingCounts,
    enabled: !!userId,
    retry: false,
  });
  const counts = countsQuery.data;
  const filtered = Object.values(filters).some(Boolean);
  const empty = myBookingsEmpty(tab, filtered);

  function switchTab(next: MyBookingTab) {
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
          </div>
          <Link
            href="/services"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" aria-hidden /> Book a service
          </Link>
        </div>

        <div className="flex gap-1 rounded-lg bg-kampmax-muted p-1" role="tablist" aria-label="Booking filters">
          {MY_BOOKING_TABS.map((t) => (
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
              {!!counts?.[t.key] && (
                <span
                  className={cn(
                    "min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold",
                    tab === t.key ? "bg-kampmax-blue text-white" : "bg-kampmax-border text-kampmax-text-secondary"
                  )}
                >
                  {counts?.[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <BookingFilters role="customer" query={query} onChange={patchFilters} />

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
          <BookingEmptyState
            title={empty.title}
            description={empty.text}
            ctaHref={filtered ? undefined : "/services"}
            ctaLabel={filtered ? undefined : "Find a service"}
          />
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