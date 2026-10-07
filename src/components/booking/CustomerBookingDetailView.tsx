"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CalendarClock,
  CalendarPlus,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCcw,
  ShieldCheck,
  StickyNote,
  User,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  formatBookingDate,
  formatBookingDay,
  formatBookingTime,
  getBookingReadyState,
  fetchCustomerBooking,
} from "@/services/booking";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { FulfillmentStatusBadge } from "./FulfillmentStatusBadge";
import { BookingTimeline } from "./BookingTimeline";
import { CancelBookingModal } from "./CancelBookingModal";
import { RescheduleModal } from "./RescheduleModal";
import { ConfirmCompletionModal } from "./ConfirmCompletionModal";
import { ReportProblemModal } from "./ReportProblemModal";
import { LeaveReviewModal } from "./LeaveReviewModal";
import { SettlementPanel } from "./SettlementPanel";
import { CompletionCard } from "./CompletionCard";
import { BookingEmptyState } from "./BookingEmptyState";
import type { ServiceBooking } from "@/types/booking";

export function CustomerBookingDetailView({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCustomerBooking(bookingId)
      .then((b) => {
        if (cancelled) return;
        setBooking(b);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load this booking.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  /** Shows the booking the server just returned, and refreshes every list that includes it. */
  function update(updated: ServiceBooking) {
    setBooking(updated);
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  }

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (loading && !booking) {
    return (
      <PageContainer>
        <p className="py-10 text-center text-sm text-kampmax-text-secondary">Loading your booking…</p>
      </PageContainer>
    );
  }

  if (loadError && !booking) {
    return (
      <PageContainer>
        <BookingEmptyState
          title="We couldn't load this booking"
          description={loadError}
          ctaHref="/customer/bookings"
          ctaLabel="Back to my bookings"
        />
      </PageContainer>
    );
  }

  if (!booking) {
    return (
      <PageContainer>
        <BookingEmptyState
          title="Booking not found"
          description="It may have been removed, or the link isn't yours."
          ctaHref="/customer/bookings"
          ctaLabel="Back to my bookings"
        />
      </PageContainer>
    );
  }

  const ready = getBookingReadyState(booking);
  const startMs = new Date(booking.startAt).getTime();

  return (
    <PageContainer>
      <div className="space-y-4">
        <Link
          href="/customer/bookings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-primary-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> My bookings
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900">{booking.serviceName}</h1>
              <BookingStatusBadge status={booking.status} />
              {booking.status === "completed" && (
                <FulfillmentStatusBadge
                  status={booking.fulfillment.confirmationStatus}
                  perspective="customer"
                  showAlways
                />
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Ref <span className="font-mono font-semibold">{booking.bookingReference}</span>
              {booking.bookingPreference === "request_approval" && booking.status === "pending" && (
                <span className="ml-2 font-medium text-warning-600">
                  · Waiting for the provider to confirm
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {ready.canReschedule && (
              <button
                onClick={() => setReschedOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-700 hover:border-neutral-300"
              >
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden /> Reschedule
              </button>
            )}
            {ready.canCancel && (
              <button
                onClick={() => setCancelOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-error-50 px-3.5 py-2 text-xs font-bold text-error-700 hover:bg-error-100"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden /> Cancel booking
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section aria-labelledby="when-title" className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 id="when-title" className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                Schedule
              </h2>
              <div className="mt-2">
                <p className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                  <CalendarClock className="h-4 w-4 text-primary-600" aria-hidden />
                  {formatBookingDate(startMs)} · {formatBookingTime(startMs)}–{formatBookingTime(new Date(booking.endAt).getTime())}
                </p>
                <p className="mt-1 pl-6 text-[11px] text-neutral-400">
                  {booking.durationMinutes} min · {booking.timeZone}
                </p>
              </div>
            </section>

            <section aria-labelledby="summary-title" className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 id="summary-title" className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                Details
              </h2>
              <dl className="mt-2 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  <div>
                    <p className="font-semibold text-neutral-900">{booking.location.label}</p>
                    {booking.location.address && (
                      <p className="text-xs text-neutral-500">{booking.location.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {booking.price.model === "range"
                        ? "₦" + booking.price.amount.toLocaleString("en-NG") + "–" + booking.price.amountMax?.toLocaleString("en-NG")
                        : "₦" + booking.price.amount.toLocaleString("en-NG")}
                    </p>
                    <p className="text-[11px] text-neutral-500">{booking.price.note}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  <p className="font-semibold text-neutral-900">{booking.customer.phone}</p>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  <p className="font-semibold text-neutral-900">{booking.customer.name}</p>
                </div>
                {booking.notes && (
                  <div className="flex items-start gap-2">
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                    <p className="text-neutral-700">{booking.notes}</p>
                  </div>
                )}
              </dl>
            </section>

            <section aria-labelledby="provider-title" className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="provider-title" className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Provider
                  </h2>
                  <Link
                    href={`/services/providers/${booking.providerId}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:underline"
                  >
                    View provider profile <ArrowLeft className="h-3.5 w-3.5 rotate-180" aria-hidden />
                  </Link>
                </div>
                <Link
                  href={`/chat?serviceId=${booking.serviceId}&bookingRef=${booking.bookingReference}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Message Provider
                </Link>
              </div>
            </section>

            <section aria-labelledby="timeline-title" className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 id="timeline-title" className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                Activity
              </h2>
              <div className="mt-3">
                <BookingTimeline timeline={booking.timeline} />
              </div>
            </section>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
            <SettlementPanel booking={booking} />

            {ready.requiresProviderApproval && (
              <p className="flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>Your request is awaiting the provider&apos;s confirmation.</span>
              </p>
            )}

            {ready.canConfirmCompletion && (
              <div className="rounded-xl border border-info-200 bg-info-50 p-3.5">
                <p className="text-xs font-bold text-info-800">
                  This service needs your sign-off
                </p>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2 text-xs font-bold text-white hover:bg-success-700"
                >
                  It&apos;s done — confirm
                </button>
              </div>
            )}

            {booking.status === "completed" && (
              <CompletionCard
                booking={booking}
                canReview={ready.canReview}
                onConfirm={() => setConfirmOpen(true)}
                onReport={() => setReportOpen(true)}
                onReview={() => setReviewOpen(true)}
              />
            )}

            <div className="rounded-xl border border-neutral-200 bg-white p-3.5 text-[11px] text-neutral-500">
              <p className="flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />
                {booking.cancellationPolicy.message}
              </p>
              <p className="mt-2 flex items-start gap-1.5">
                <CalendarPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                {booking.bookingPreference === "instant"
                  ? "Instant booking — your slot is locked."
                  : "Request booking — locked once the provider accepts."}
              </p>
            </div>

            {(booking.status === "confirmed" || booking.status === "in_progress") && (
              <Link
                href={`/services/${booking.serviceId}/book`}
                className={cn(
                  "block rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-center text-xs font-bold text-primary-700 hover:bg-primary-100"
                )}
              >
                Book {booking.serviceName} again
              </Link>
            )}
          </aside>
        </div>
      </div>

      {cancelOpen && (
        <CancelBookingModal
          booking={booking}
          onClose={() => setCancelOpen(false)}
          onComplete={(updated) => {
            update(updated);
            setCancelOpen(false);
          }}
        />
      )}
      {reschedOpen && (
        <RescheduleModal
          booking={booking}
          onClose={() => setReschedOpen(false)}
          onComplete={(updated) => {
            update(updated);
            setReschedOpen(false);
          }}
        />
      )}
      {confirmOpen && (
        <ConfirmCompletionModal
          booking={booking}
          onClose={() => setConfirmOpen(false)}
          onComplete={(updated) => {
            update(updated);
            setConfirmOpen(false);
          }}
        />
      )}
      {reportOpen && (
        <ReportProblemModal
          booking={booking}
          onClose={() => setReportOpen(false)}
          onComplete={(updated) => {
            update(updated);
            setReportOpen(false);
          }}
        />
      )}
      {reviewOpen && (
        <LeaveReviewModal
          booking={booking}
          onClose={() => setReviewOpen(false)}
          onComplete={(updated) => {
            update(updated);
            setReviewOpen(false);
          }}
        />
      )}
    </PageContainer>
  );
}