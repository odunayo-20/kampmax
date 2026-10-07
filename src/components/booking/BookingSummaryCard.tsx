"use client";

import { CalendarClock, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { formatBookingDay, formatBookingTime } from "@/services/booking";
import type { BookingAvailabilityResponse, BookingSlot, DayAvailability } from "@/types/booking";

/**
 * Sticky summary shown beside the booking wizard. Pure presentation of what the
 * backend returned — the customer cannot change price or slots here.
 */
export function BookingSummaryCard({
  availability,
  providerName,
  selectedDay,
  selectedSlot,
  locationTypeLabel,
  address,
  phone,
  className,
}: {
  availability: BookingAvailabilityResponse;
  providerName: string;
  selectedDay?: DayAvailability;
  selectedSlot?: BookingSlot | null;
  locationTypeLabel?: string;
  address?: string;
  phone?: string;
  className?: string;
}) {
  const slot = selectedSlot;

  return (
    <aside
      aria-label="Booking summary"
      className={cn("rounded-xl border border-neutral-200 bg-white p-4", className)}
    >
      <div className="flex items-center gap-3">
        {availability.serviceImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={availability.serviceImageUrl}
            alt=""
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-700">
            {availability.serviceName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-neutral-900">
            {availability.serviceName}
          </p>
          <p className="truncate text-xs text-neutral-500">by {providerName}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <dt className="flex items-center gap-1.5 text-xs text-neutral-500">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden /> When
          </dt>
          <dd className="text-right text-xs font-semibold text-neutral-800">
            {selectedDay && slot
              ? `${formatBookingDay(slot.startAt)} · ${formatBookingTime(slot.startAt)}–${formatBookingTime(new Date(new Date(slot.startAt).getTime() + slot.durationMinutes * 60_000).getTime())}`
              : "—"}
            <span className="block text-[10px] font-normal text-neutral-400">
              {availability.durationMinutes} min · {availability.timeZone}
            </span>
          </dd>
        </div>

        <div className="flex items-start justify-between gap-2">
          <dt className="flex items-center gap-1.5 text-xs text-neutral-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> Where
          </dt>
          <dd className="max-w-[60%] text-right text-xs font-semibold text-neutral-800">
            {locationTypeLabel ?? availability.locationLabel}
            {address ? <span className="block font-normal">{address}</span> : null}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-2">
          <dt className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Wallet className="h-3.5 w-3.5" aria-hidden /> Price
          </dt>
          <dd className="text-right">
            <span className="text-sm font-bold text-neutral-900">
              {availability.price.model === "range"
                ? `${formatNaira(availability.price.amount)}–${formatNaira(availability.price.amountMax ?? availability.price.amount)}`
                : formatNaira(availability.price.amount)}
            </span>
            {availability.price.model !== "fixed" && (
              <span className="block text-[10px] font-normal text-neutral-400">
                confirmed with the provider
              </span>
            )}
          </dd>
        </div>

        {phone && (
          <div className="flex items-start justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-xs text-neutral-500">Phone</dt>
            <dd className="text-right text-xs font-semibold text-neutral-800">{phone}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3 text-[11px] text-neutral-500">
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />
          <span>
            {availability.bookingPreference === "instant"
              ? "Instant booking — your slot locks once you confirm."
              : "This provider confirms requests before the slot locks."}
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />
          <span>
            Free cancellation up to 2 hours before. The price is taken from your wallet when you book and
            held safely until you confirm the service.
          </span>
        </p>
      </div>
    </aside>
  );
}