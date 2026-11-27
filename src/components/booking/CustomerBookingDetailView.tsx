"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CalendarClock,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCcw,
  ShieldCheck,
  StickyNote,
  Wallet,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";
import { useCandidateConversation } from "@/hooks";
import { canBookAgain, REQUEST_NOTE } from "@/lib/my-bookings-list";
import {
  formatBookingDate,
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

type Modal = "cancel" | "reschedule" | "confirm" | "report" | "review" | null;

const MODALS = {
  cancel: CancelBookingModal,
  reschedule: RescheduleModal,
  confirm: ConfirmCompletionModal,
  report: ReportProblemModal,
  review: LeaveReviewModal,
} as const;

export function CustomerBookingDetailView({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const openConversation = useCandidateConversation();
  const [modal, setModal] = useState<Modal>(null);
  const [chatState, setChatState] = useState<"idle" | "opening" | "failed">("idle");

  const key = ["bookings", "customer", "one", bookingId];
  const q = useQuery({ queryKey: key, queryFn: () => fetchCustomerBooking(bookingId), retry: false });
  const booking = q.data;

  /** Shows the booking the server just returned, and refreshes every list that includes it. */
  function update(updated: ServiceBooking) {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: ["bookings"], predicate: (query) => query.queryKey[2] !== "one" });
    setModal(null);
  }

  function messageProvider(userId: string) {
    setChatState("opening");
    void openConversation(userId).then((conversationId) => {
      if (conversationId) router.push(`/chat/${conversationId}`);
      else setChatState("failed");
    });
  }

  if (q.isPending) {
    return (
      <PageContainer>
        <p className="py-10 text-center text-sm text-kampmax-text-secondary">Loading your booking…</p>
      </PageContainer>
    );
  }

  if (q.isError) {
    return (
      <PageContainer>
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-6 text-center text-sm text-kampmax-text-secondary">
          <p className="font-bold text-neutral-800">Couldn&apos;t load this booking</p>
          <p className="mt-1">Check your connection and try again.</p>
          <button type="button" onClick={() => void q.refetch()} className="mt-3 font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </div>
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
  const providerUserId = booking.provider?.userId;
  const ActiveModal = modal ? MODALS[modal] : null;

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
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {ready.canReschedule && (
              <button
                onClick={() => setModal("reschedule")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-700 hover:border-neutral-300"
              >
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden /> Reschedule
              </button>
            )}
            {ready.canCancel && (
              <button
                onClick={() => setModal("cancel")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-error-50 px-3.5 py-2 text-xs font-bold text-error-700 hover:bg-error-100"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden /> Cancel booking
              </button>
            )}
          </div>
        </div>
        {ready.cancelBlockedReason && <p className="text-xs text-neutral-500">{ready.cancelBlockedReason}</p>}

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
                    {/* The amount on a booking is what was charged, whatever the service's pricing model. */}
                    <p className="font-semibold text-neutral-900">{formatNaira(booking.price.amount)}</p>
                    <p className="text-[11px] text-neutral-500">{booking.price.note}</p>
                  </div>
                </div>
                {booking.customer.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                    <p>
                      <span className="text-neutral-500">Your phone </span>
                      <span className="font-semibold text-neutral-900">{booking.customer.phone}</span>
                    </p>
                  </div>
                )}
                {booking.notes && (
                  <div className="flex items-start gap-2">
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                    <p className="text-neutral-700">{booking.notes}</p>
                  </div>
                )}
              </dl>
            </section>

            <section aria-labelledby="provider-title" className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="provider-title" className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Provider
                  </h2>
                  <Link
                    href={`/services/providers/${booking.providerId}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:underline"
                  >
                    {booking.provider?.displayName ?? "View provider profile"}
                  </Link>
                </div>
                {providerUserId && (
                  <button
                    type="button"
                    disabled={chatState === "opening"}
                    onClick={() => messageProvider(providerUserId)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    {chatState === "opening" ? "Opening chat…" : "Message the provider"}
                  </button>
                )}
              </div>
              {chatState === "failed" && (
                <p role="alert" className="mt-2 text-xs text-error-600">
                  Couldn&apos;t open the chat. Try again.
                </p>
              )}
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
            <SettlementPanel booking={booking} viewer="customer" />

            {ready.requiresProviderApproval && (
              <p className="flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{REQUEST_NOTE}</span>
              </p>
            )}

            {booking.status === "completed" && (
              <CompletionCard
                booking={booking}
                canReview={ready.canReview}
                onConfirm={() => setModal("confirm")}
                onReport={() => setModal("report")}
                onReview={() => setModal("review")}
              />
            )}

            <p className="flex items-start gap-1.5 rounded-xl border border-neutral-200 bg-white p-3.5 text-[11px] text-neutral-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />
              {booking.cancellationPolicy.message}
            </p>

            {canBookAgain(booking.status) && (
              <Link
                href={`/services/${booking.serviceId}`}
                className="block rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-center text-xs font-bold text-primary-700 hover:bg-primary-100"
              >
                Book again
              </Link>
            )}
          </aside>
        </div>
      </div>

      {ActiveModal && <ActiveModal booking={booking} onClose={() => setModal(null)} onComplete={update} />}
    </PageContainer>
  );
}
