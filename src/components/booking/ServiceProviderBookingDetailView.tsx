"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MapPin,
  Phone,
  PlayCircle,
  ShieldCheck,
  StickyNote,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  fetchProviderBookingByIdLive,
  formatBookingDate,
  formatBookingDay,
  formatBookingTime,
  getProviderBooking,
  startBooking,
} from "@/services/booking";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { FulfillmentStatusBadge } from "./FulfillmentStatusBadge";
import { BookingTimeline } from "./BookingTimeline";
import { AcceptBookingModal } from "./AcceptBookingModal";
import { DeclineBookingModal } from "./DeclineBookingModal";
import { CompleteBookingModal } from "./CompleteBookingModal";
import { SettlementPanel } from "./SettlementPanel";
import { BookingEmptyState } from "./BookingEmptyState";
import type { BookingError, ServiceBooking } from "@/types/booking";

const START_WINDOW_MS = 30 * 60 * 1000;

export function ServiceProviderBookingDetailView({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<ServiceBooking | null>(() =>
    getProviderBooking(bookingId)
  );
  const [loading, setLoading] = useState(!booking);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"start" | null>(null);
  const [error, setError] = useState<BookingError | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProviderBookingByIdLive(bookingId)
      .then((live) => {
        if (!cancelled && live) {
          setBooking(live);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loading && !booking) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-6">
        <Link
          href="/service-provider/bookings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Bookings
        </Link>
        <BookingEmptyState
          title="Booking not found"
          description="It may have been removed, or the booking isn&apos;t booked on your profile."
        />
      </div>
    );
  }

  const startMs = new Date(booking.startAt).getTime();
  const nowMs = Date.now();
  const activeBookingId = booking.id;
  const canStart = booking.status === "confirmed" && nowMs >= startMs - START_WINDOW_MS;
  const canComplete = booking.status === "in_progress";
  const pending = booking.status === "pending";

  function runSimple(action: "start") {
    if (busyAction) return;
    setBusyAction(action);
    setError(null);
    const result = startBooking(activeBookingId);
    setBusyAction(null);
    if (result.ok) {
      setBooking(result.booking);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/service-provider/bookings"
        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-primary-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Bookings
      </Link>

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
            <span className="ml-2">by {booking.customer.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {pending && (
            <>
              <button
                onClick={() => setDeclineOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-error-50 px-3.5 py-2 text-xs font-bold text-error-700 hover:bg-error-100"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden /> Decline
              </button>
              <button
                onClick={() => setAcceptOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-success-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Accept booking
              </button>
            </>
          )}

          {booking.status === "confirmed" && (
            <button
              onClick={() => runSimple("start")}
              disabled={!canStart || busyAction !== null}
              title={canStart ? "Start this appointment" : `Work can start from ${formatBookingDate(startMs)} · ${formatBookingTime(startMs)}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors",
                canStart && busyAction === null
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "cursor-not-allowed bg-neutral-200 text-neutral-500"
              )}
            >
              {busyAction === "start" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" aria-hidden />
              )}
              Start booking
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => setCompleteOpen(true)}
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
          {error.message}
        </p>
      )}

      {booking.status === "confirmed" && !canStart && (
        <p className="rounded-lg border border-info-200 bg-info-50 p-3 text-xs text-info-800">
          You can start this appointment from {formatBookingDate(startMs)} at{" "}
          {formatBookingTime(startMs)} (30-minute grace window included).
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
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                {booking.customer.name.slice(0, 1).toUpperCase()}
              </div>
              <dl className="flex-1 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                  <span className="font-semibold text-kampmax-text">{booking.customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                  <span className="text-kampmax-text-secondary">{booking.customer.phone}</span>
                </div>
              </dl>
            </div>
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
          </section>

          <section aria-labelledby="pay-title" className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 id="pay-title" className="text-xs font-bold uppercase tracking-wide text-kampmax-text-muted">
              Payment & price
            </h2>
            <p className="mt-2 text-sm font-bold text-kampmax-text">
              <Wallet className="mr-1.5 inline h-4 w-4 text-primary-600" aria-hidden />
              {booking.price.model === "fixed"
                ? "₦" + booking.price.amount.toLocaleString("en-NG")
                : booking.price.model === "range"
                  ? "₦" + booking.price.amount.toLocaleString("en-NG") + "–" + booking.price.amountMax?.toLocaleString("en-NG")
                  : "From ₦" + booking.price.amount.toLocaleString("en-NG")}
            </p>
            <p className="mt-1 text-xs text-kampmax-text-muted">{booking.price.note}</p>
            <div className="mt-3">
              <SettlementPanel booking={booking} />
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

          <div className="rounded-xl border border-kampmax-border bg-white p-4 text-[11px] text-kampmax-text-secondary">
            <p className="flex items-start gap-1.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />
              {booking.cancellationPolicy.message}
            </p>
            {pending && (
              <p className="mt-2">
                Respond to this request — the customer is notified as soon as you accept or decline.
              </p>
            )}
          </div>
        </aside>
      </div>

      {acceptOpen && (
        <AcceptBookingModal
          booking={booking}
          onClose={() => setAcceptOpen(false)}
          onComplete={(updated) => {
            setBooking(updated);
            setAcceptOpen(false);
          }}
        />
      )}
      {declineOpen && (
        <DeclineBookingModal
          booking={booking}
          onClose={() => setDeclineOpen(false)}
          onComplete={(updated) => {
            setBooking(updated);
            setDeclineOpen(false);
          }}
        />
      )}
      {completeOpen && (
        <CompleteBookingModal
          booking={booking}
          onClose={() => setCompleteOpen(false)}
          onComplete={(updated) => {
            setBooking(updated);
            setCompleteOpen(false);
          }}
        />
      )}
    </div>
  );
}