"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Lock,
  MapPin,
  Phone,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  createBooking,
  fetchBookingAvailability,
  formatBookingDay,
  formatBookingTime,
  getBookingLocationOptions,
} from "@/services/booking";
import { fetchMyWallet } from "@/services/wallet";
import { formatNaira } from "@/lib/utils";
import { BookingDayPicker } from "./BookingDayPicker";
import { BookingTimeSlotGrid } from "./BookingTimeSlotGrid";
import { BookingSummaryCard } from "./BookingSummaryCard";
import type {
  BookingError,
  BookingSlot,
  DayAvailability,
} from "@/types/booking";

type Step = "schedule" | "details" | "review" | "confirmation";

const STEPS: { key: Step; label: string }[] = [
  { key: "schedule", label: "Date & time" },
  { key: "details", label: "Your details" },
  { key: "review", label: "Review & confirm" },
];

/**
 * Multi-step booking flow for /services/[serviceId]/book.
 *
 * - Availability comes ONLY from the backend-derived response (never recomputed
 *   locally from weekly hours). After a 409 the slot list is re-fetched so the
 *   taken state reflects the newest backend truth.
 * - Creates are idempotent (per-submission key), so a double-submit or a retry
 *   after an ambiguous timeout returns the SAME booking, not a duplicate.
 * - The flow is auth-gated; guests are sent to /login?returnTo=... and brought
 *   back here automatically.
 */
export function BookingFlow({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const { user, status } = useAuth();

  const [step, setStep] = useState<Step>("schedule");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [locationType, setLocationType] = useState(0);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<BookingError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; reference: string } | null>(null);
  const idempotencyRef = useRef<string>("");

  const queryClient = useQueryClient();

  // Times come from the backend; they are fetched again when a slot is lost to someone else.
  const availabilityQuery = useQuery({
    queryKey: ["booking-availability", serviceId, refreshKey],
    queryFn: () => fetchBookingAvailability(serviceId),
    enabled: !!user,
    retry: false,
    staleTime: 0,
  });
  const availabilityData = availabilityQuery.data;
  const walletQuery = useQuery({
    queryKey: ["booking-wallet"],
    queryFn: fetchMyWallet,
    enabled: !!user,
    retry: false,
  });

  const selectedDay: DayAvailability | undefined = availabilityData?.days.find(
    (d) => d.date === selectedDate
  );

  // Guests → login, then come back to this exact URL.
  useEffect(() => {
    if (status === "loading") return;
    if (!user) {
      router.replace(
        `/login?returnTo=${encodeURIComponent(`/services/${serviceId}/book`)}`
      );
    }
  }, [status, user, router, serviceId]);

  useEffect(() => {
    if (phone === "" && user?.phone) setPhone(user.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.phone]);

  useEffect(() => {
    if (!availabilityData || selectedDate) return;
    const first = availabilityData.days.find((d) => d.available);
    setSelectedDate(first?.date ?? availabilityData.days[0]?.date ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityData, selectedDate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!user) return null;

  if (availabilityQuery.isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!availabilityData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <AlertCircle className="h-6 w-6 text-neutral-500" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-bold text-neutral-900">
          This service can&apos;t be booked right now
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {availabilityQuery.error instanceof Error
            ? availabilityQuery.error.message
            : "Some services go through the request-quote flow instead."}
        </p>
        <Link
          href="/services"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Browse services <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  const availability = availabilityData;
  const service = { id: availability.serviceId, name: availability.serviceName };
  const provider = { id: availability.providerId, displayName: availability.providerName };
  const price = availability.price.amount;
  const balance = walletQuery.data?.balance;
  const shortBy = balance !== undefined && balance < price ? price - balance : 0;

  function goBack() {
    setError(null);
    if (step === "review") setStep("details");
    else if (step === "details") setStep("schedule");
  }

  function goToSchedule() {
    setStep("schedule");
    setError(null);
  }

  function pickDay(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
  }

  function pickSlot(slot: BookingSlot) {
    setSelectedSlot(slot);
  }

  function chooseLocationType(idx: number) {
    setLocationType(idx);
    setError(null);
  }

  function validateDetails(): string | null {
    if (!phone.trim()) return "Add a phone number so the provider can reach you.";
    if (
      (locationType === 1 || locationType === 3) &&
      !address.trim()
    ) {
      return "Add an address so the provider knows where to meet you.";
    }
    return null;
  }

  async function submit() {
    if (!selectedSlot || submitting) return;
    setError(null);

    const options = getBookingLocationOptions(availability.locationType);
    const chosen = options[locationType] ?? options[0];

    const detailError = validateDetails();
    if (detailError) {
      setError({ code: "422", message: detailError, field: "phone", recoverable: true });
      setStep("details");
      return;
    }
    if (shortBy > 0) {
      setError({
        code: "422",
        message: `Your wallet has ${formatNaira(balance ?? 0)} and this booking costs ${formatNaira(price)}. Top up your wallet first.`,
      });
      return;
    }

    setSubmitting(true);
    if (!idempotencyRef.current) {
      idempotencyRef.current = `bk_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
    }

    const result = await createBooking({
      serviceId,
      startAt: selectedSlot.startAt,
      locationType: chosen.type,
      address: chosen.type === "customer_location" ? address.trim() : undefined,
      notes: notes.trim() || undefined,
      customerPhone: phone.trim(),
      idempotencyKey: idempotencyRef.current,
    });
    setSubmitting(false);

    if (result.ok) {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setCreated({ id: result.booking.id, reference: result.booking.bookingReference });
      setStep("confirmation");
      return;
    }

    const err = result.error;
    if (err.code === "409") {
      // The slot went to someone else: show fresh times and pick again.
      setError(err);
      setRefreshKey((k) => k + 1);
      setStep("schedule");
      setSelectedSlot(null);
      idempotencyRef.current = "";
      return;
    }
    setError(err);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-neutral-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/services" className="hover:text-primary-600">
              Services
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={`/services/${service.id}`}
              className="hover:text-primary-600"
            >
              {service.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-medium text-neutral-700">
            Book
          </li>
        </ol>
      </nav>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Book {service.name}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            <span className="font-semibold text-neutral-700">{provider.displayName}</span> ·{" "}
            {availability.bookingPreferenceLabel}
          </p>
        </div>
        <Link
          href={`/services/${service.id}`}
          className="hidden shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-300 sm:inline-flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Service details
        </Link>
      </div>

      {step !== "confirmation" && (
        <ol
          aria-label="Booking steps"
          className="mt-5 flex items-center gap-2 text-[11px] font-semibold"
        >
          {STEPS.map((s, idx) => {
            const currentIndex = STEPS.findIndex((x) => x.key === step);
            const done = idx < currentIndex;
            const active = idx === currentIndex;
            return (
              <li key={s.key} className="flex items-center gap-2">
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                    active
                      ? "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200"
                      : done
                        ? "text-success-600"
                        : "text-neutral-400"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                      active
                        ? "bg-primary-600 text-white"
                        : done
                          ? "bg-success-500 text-white"
                          : "bg-neutral-200 text-neutral-500"
                    )}
                  >
                    {done ? <Check className="h-3 w-3" aria-hidden /> : idx + 1}
                  </span>
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && <span className="h-px w-4 bg-neutral-200" aria-hidden />}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {step === "schedule" && (
            <section
              aria-labelledby="schedule-title"
              className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5"
            >
              <h2 id="schedule-title" className="text-base font-bold text-neutral-900">
                1 · Choose a time
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                Showing the next {availability.maxAdvanceDays} days ({availability.timeZone}).
                {availability.bookingPreference === "request_approval" && (
                  <span className="mt-1 block text-warning-600">
                    This provider confirms requests first — your time is reserved once they accept.
                  </span>
                )}
              </p>

              <div className="mt-4">
                <BookingDayPicker
                  days={availability.days}
                  selectedDate={selectedDate}
                  onSelect={pickDay}
                  timeZone={availability.timeZone}
                />
              </div>

              <div className="mt-4 border-t border-neutral-100 pt-4">
                {selectedDay ? (
                  selectedDay.available ? (
                    <BookingTimeSlotGrid
                      day={selectedDay}
                      selectedStartAt={selectedSlot?.startAt ?? ""}
                      onSelect={pickSlot}
                      noticeHint={
                        availability.minAdvanceHours > 0
                          ? `Book at least ${availability.minAdvanceHours}h before the start time.`
                          : undefined
                      }
                    />
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                      <p>{selectedDay.reasonLabel}</p>
                    </div>
                  )
                ) : null}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <Link
                  href={`/services/${service.id}`}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-700"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Back
                </Link>
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => {
                    setError(null);
                    setStep("details");
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors",
                    selectedSlot
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "cursor-not-allowed bg-neutral-200 text-neutral-500"
                  )}
                >
                  Continue <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </section>
          )}

          {step === "details" && (
            <section
              aria-labelledby="details-title"
              className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5"
            >
              <h2 id="details-title" className="text-base font-bold text-neutral-900">
                2 · Your details
              </h2>

              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-neutral-700">Where should it happen?</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {getBookingLocationOptions(availability.locationType).map((opt, idx) => (
                      <button
                        key={opt.type}
                        type="button"
                        aria-pressed={locationType === idx}
                        onClick={() => chooseLocationType(idx)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          locationType === idx
                            ? "border-primary-600 bg-primary-50 ring-1 ring-inset ring-primary-200"
                            : "border-neutral-200 bg-white hover:border-neutral-300"
                        )}
                      >
                        <MapPin
                          className={cn(
                            "h-4 w-4",
                            locationType === idx ? "text-primary-600" : "text-neutral-400"
                          )}
                          aria-hidden
                        />
                        <p className="mt-1.5 text-sm font-semibold text-neutral-900">{opt.label}</p>
                        <p className="mt-0.5 text-[11px] text-neutral-500">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                  {(locationType === 1 || locationType === 3) && (
                    <label className="mt-3 block">
                      <span className="text-xs font-medium text-neutral-600">
                        Address or meeting spot <span className="text-error-500">*</span>
                      </span>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Hostel B, Room 214 — Obafemi Awolowo University"
                        className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                      />
                    </label>
                  )}
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">
                    Phone number <span className="text-error-500">*</span>
                  </span>
                  <span className="relative mt-1.5 block">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 ..."
                      className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">Notes for the provider (optional)</span>
                  <span className="relative mt-1.5 block">
                    <StickyNote className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" aria-hidden />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Device model, make, anything the provider should know..."
                      className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </span>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-700"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const err = validateDetails();
                    if (err) {
                      setError({ code: "422", message: err, recoverable: true });
                      return;
                    }
                    setError(null);
                    setStep("review");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
                >
                  Review booking <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </section>
          )}

          {step === "review" && selectedSlot && (
            <section
              aria-labelledby="review-title"
              className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5"
            >
              <h2 id="review-title" className="text-base font-bold text-neutral-900">
                3 · Review &amp; confirm
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <Row label="Service" value={service.name} />
                <Row label="Provider" value={provider.displayName} />
                <Row
                  label="When"
                  value={`${formatBookingDay(selectedSlot.startAt)} · ${formatBookingTime(selectedSlot.startAt)}–${formatBookingTime(new Date(new Date(selectedSlot.startAt).getTime() + selectedSlot.durationMinutes * 60_000).getTime())} (${availability.durationMinutes} min)`}
                />
                <Row
                  label="Where"
                  value={
                    getBookingLocationOptions(availability.locationType)[locationType]?.label ??
                    availability.locationLabel
                  }
                  sub={address || undefined}
                />
                <Row label="Phone" value={phone} />
                {notes.trim() && <Row label="Notes" value={notes} />}
                <Row label="Price" value={formatNaira(price)} sub={availability.price.note} />
                <Row
                  label="Your wallet"
                  value={balance === undefined ? "Checking…" : formatNaira(balance)}
                  sub={
                    shortBy > 0
                      ? `You need ${formatNaira(shortBy)} more to book this.`
                      : "The price is taken now and held safely until you confirm the service."
                  }
                />
              </div>

              {shortBy > 0 && (
                <Link
                  href="/profile/wallet"
                  className="mt-3 inline-block rounded-lg bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                >
                  Top up your wallet
                </Link>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {error.message}
                </p>
              )}

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-700"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Back
                </button>
                <button
                  type="button"
                  disabled={submitting || shortBy > 0}
                  onClick={() => void submit()}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors",
                    submitting
                      ? "cursor-wait bg-primary-400"
                      : "bg-primary-600 hover:bg-primary-700"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Confirming…
                    </>
                  ) : (
                    <>
                      <CalendarCheck2 className="h-4 w-4" aria-hidden />
                      {availability.bookingPreference === "instant"
                        ? `Pay ${formatNaira(price)} and book`
                        : `Pay ${formatNaira(price)} and send request`}
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {step === "confirmation" && created && (
            <section
              aria-labelledby="confirm-title"
              className="rounded-xl border border-success-200 bg-white p-6 text-center sm:p-8"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
                <CheckCircle2 className="h-8 w-8 text-success-600" aria-hidden />
              </div>
              <h2 id="confirm-title" className="mt-4 text-lg font-bold text-neutral-900">
                {availability.bookingPreference === "instant"
                  ? "You're booked!"
                  : "Request sent"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                {availability.bookingPreference === "instant"
                  ? `${service.name} is locked in for ${formatBookingDay(selectedSlot!.startAt)} at ${formatBookingTime(selectedSlot!.startAt)}.`
                  : `${service.name} is reserved for ${formatBookingDay(selectedSlot!.startAt)} at ${formatBookingTime(selectedSlot!.startAt)} and waits for ${provider.displayName} to confirm.`}
              </p>
              <p className="mt-2 text-xs text-neutral-400">
                Booking reference <span className="font-mono font-semibold">{created.reference}</span>
              </p>

              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <Link
                  href={`/customer/bookings/${created.id}`}
                  className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
                >
                  View my booking
                </Link>
                <Link
                  href="/services"
                  className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:border-neutral-300"
                >
                  Back to services
                </Link>
              </div>
            </section>
          )}
        </div>

        {step !== "confirmation" && (
          <div className="lg:sticky lg:top-6 lg:self-start">
            <BookingSummaryCard
              availability={availability}
              providerName={provider.displayName}
              selectedDay={selectedDay}
              selectedSlot={selectedSlot}
              locationTypeLabel={
                step === "details" || step === "review"
                  ? getBookingLocationOptions(availability.locationType)[locationType]?.label
                  : undefined
              }
              address={address || undefined}
              phone={step === "details" || step === "review" ? phone : undefined}
            />

            {error && selectedSlot && (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800"
              >
                <p className="flex items-start gap-1.5 font-semibold">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {error.message}
                </p>
                {error.suggestedSlots && error.suggestedSlots.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px]">
                    {error.suggestedSlots.map((s) => (
                      <li key={s} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-warning-500" aria-hidden />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={goToSchedule}
                  className="mt-2.5 rounded-lg border border-warning-300 bg-white px-3 py-1.5 text-[11px] font-bold text-warning-800 hover:bg-warning-100"
                >
                  Pick another time
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-2.5 last:border-0 last:pb-0">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="max-w-[65%] text-right text-xs font-semibold text-neutral-900">
        {value}
        {sub && <span className="block font-normal text-neutral-500">{sub}</span>}
      </dd>
    </div>
  );
}