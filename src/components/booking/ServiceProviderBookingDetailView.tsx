"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MapPin,
  Phone,
  PlayCircle,
  StickyNote,
  XCircle,
} from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { describeBookingActionError, startOpensAt } from "@/lib/my-bookings-list";
import {
  formatBookingDate,
  formatBookingTime,
  fetchProviderBooking,
  startBooking,
} from "@/services/booking";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { FulfillmentStatusBadge } from "./FulfillmentStatusBadge";
import { BookingTimeline } from "./BookingTimeline";
import { AcceptBookingModal } from "./AcceptBookingModal";
import { CancelBookingModal } from "./CancelBookingModal";
import { DeclineBookingModal } from "./DeclineBookingModal";
import { CompleteBookingModal } from "./CompleteBookingModal";
import { SettlementPanel } from "./SettlementPanel";
import { BookingEmptyState } from "./BookingEmptyState";
import type { BookingError, ServiceBooking } from "@/types/booking";

type Modal = "accept" | "decline" | "complete" | "cancel" | null;

const MODALS = {
  accept: AcceptBookingModal,
  decline: DeclineBookingModal,
  complete: CompleteBookingModal,
} as const;

const BACK = (
  <Link
    href="/service-provider/bookings"
    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-primary-600"
  >
    <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Bookings
  </Link>
);

export function ServiceProviderBookingDetailView({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<Modal>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<BookingError | null>(null);
  // The clock moves while the page is open: "Start" unlocks 30 minutes before the booking without a refresh.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const key = ["bookings", "provider", "one", bookingId];
  const q = useQuery({ queryKey: key, queryFn: () => fetchProviderBooking(bookingId), retry: false });
  const booking = q.data;

  /** Shows the booking the server just returned, and refreshes every list that includes it. */
  function update(updated: ServiceBooking) {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: ["bookings"], predicate: (query) => query.queryKey[2] !== "one" });
    setModal(null);
  }

  async function start(id: string) {
    if (starting) return;
    setStarting(true);
    setError(null);
    const result = await startBooking(id);
    setStarting(false);
    if (result.ok) update(result.booking);
    else setError(result.error);
  }

  if (q.isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="space-y-6">
        {BACK}
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-6 text-center text-sm text-kampmax-text-secondary">
          <p className="font-bold text-neutral-800">Couldn&apos;t load this booking</p>
          <p className="mt-1">Check your connection and try again.</p>
          <button type="button" onClick={() => void q.refetch()} className="mt-3 font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-6">
        {BACK}
        <BookingEmptyState
          title="Booking not found"
          description="It may have been removed, or it isn't booked on your profile."
        />
      </div>
    );
  }

  const startMs = new Date(booking.startAt).getTime();
  const opensAt = startOpensAt(booking, nowMs);
  const canStart = booking.status === "confirmed" && opensAt === null;
  const ActiveModal = modal && modal !== "cancel" ? MODALS[modal] : null;

  return (
    <div className="space-y-6">
      {BACK}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-kampmax-text">{booking.serviceName}</h1>
            <BookingStatusBadge status={booking.status} />
            {booking.status === "completed" && (
              <FulfillmentStatusBadge
                status={booking.fulfillment.confirmationStatus}
                perspective="provider"
                showAlways
              />
            )}
          </div>
          <p className="mt-1 text-xs text-kampmax-text-muted">
            Ref <span className="font-mono font-semibold">{booking.bookingReference}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {booking.status === "pending" && (
            <>
              <button
                onClick={() => setModal("decline")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-error-50 px-3.5 py-2 text-xs font-bold text-error-700 hover:bg-error-100"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden /> Decline
              </button>
              <button
                onClick={() => setModal("accept")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-success-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Accept booking
              </button>
            </>
          )}

          {booking.status === "confirmed" && (
            <>
              <button
                onClick={() => setModal("cancel")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-error-50 px-3.5 py-2 text-xs font-bold text-error-700 hover:bg-error-100"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden /> Cancel booking
              </button>
              <button
                onClick={() => void start(booking.id)}
                disabled={!canStart || starting}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors",
                  canStart && !starting
                    ? "bg-primary-600 text-white hover:bg-primary-700"
                    : "cursor-not-allowed bg-neutral-200 text-neutral-500"
                )}
              >
                {starting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                )}
                Start booking
              </button>
            </>
          )}

          {booking.status === "in_progress" && (
            <button
              onClick={() => setModal("complete")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-success-700"
            >
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
              Mark completed
            </button>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-3 text-xs text-error-700"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {describeBookingActionError(error.code, error.message)}
        </p>
      )}

      {opensAt !== null && (
        <p className="rounded-lg border border-info-200 bg-info-50 p-3 text-xs text-info-800">
          You can start from {formatBookingDate(opensAt)}, {formatBookingTime(opensAt)}.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section aria-labelledby="sched-title" className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 id="sched-title" className="text-xs font-bold uppercase tracking-wide text-kampmax-text-muted">
              Schedule
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-kampmax-text">
              <CalendarClock className="h-4 w-4 text-primary-600" aria-hidden />
              {formatBookingDate(startMs)} · {formatBookingTime(startMs)}–{formatBookingTime(new Date(booking.endAt).getTime())}
            </p>
            <p className="mt-1 pl-6 text-[11px] text-kampmax-text-muted">
              {booking.durationMinutes} min · {booking.timeZone}
            </p>
          </section>

          <section aria-labelledby="cust-title" className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 id="cust-title" className="text-xs font-bold uppercase tracking-wide text-kampmax-text-muted">
              Customer
            </h2>
            <p className="mt-2 text-sm font-semibold text-kampmax-text">{booking.customer.name}</p>
            {booking.customer.phone && (
              <a
                href={`tel:${booking.customer.phone}`}
                className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {booking.customer.phone}
              </a>
            )}
            <div className="mt-3 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              <div>
                <p className="font-semibold text-kampmax-text">{booking.location.label}</p>
                {booking.location.address && (
                  <p className="text-xs text-kampmax-text-secondary">{booking.location.address}</p>
                )}
              </div>
            </div>
            {booking.notes && (
              <div className="mt-3 flex items-start gap-2 text-sm">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                <p className="text-kampmax-text-secondary">{booking.notes}</p>
              </div>
            )}
            {booking.declineReason && (
              <p className="mt-3 text-xs text-kampmax-text-secondary">Reason given: {booking.declineReason}</p>
            )}
          </section>

          <section aria-labelledby="pay-title" className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 id="pay-title" className="text-xs font-bold uppercase tracking-wide text-kampmax-text-muted">
              Payment
            </h2>
            <p className="mt-2 text-sm font-bold text-kampmax-text">{formatNaira(booking.price.amount)}</p>
            <div className="mt-3">
              <SettlementPanel booking={booking} viewer="provider" />
            </div>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-kampmax-border bg-white p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-kampmax-text-muted">
              Activity
            </h2>
            <div className="mt-3">
              <BookingTimeline timeline={booking.timeline} />
            </div>
          </div>
        </aside>
      </div>

      {ActiveModal && <ActiveModal booking={booking} onClose={() => setModal(null)} onComplete={update} />}
      {modal === "cancel" && (
        <CancelBookingModal booking={booking} by="provider" onClose={() => setModal(null)} onComplete={update} />
      )}
    </div>
  );
}
