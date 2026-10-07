"use client";

import Link from "next/link";
import { ArrowRight, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { FulfillmentStatusBadge } from "./FulfillmentStatusBadge";
import { BookingDateTime } from "./BookingDateTime";
import { formatNaira } from "@/lib/utils";
import type { ServiceBooking } from "@/types/booking";

/**
 * Booking row used by both customer and provider booking lists. The href is
 * scoped to the correct dashboard by `role`.
 */
export function BookingListCard({
  booking,
  role,
  highlightsPending,
}: {
  booking: ServiceBooking;
  role: "customer" | "provider";
  highlightsPending?: boolean;
}) {
  const href =
    role === "customer"
      ? `/customer/bookings/${booking.id}`
      : `/service-provider/bookings/${booking.id}`;

  const priceLabel =
    booking.price.model === "fixed"
      ? formatNaira(booking.price.amount)
      : booking.price.model === "range"
        ? `${formatNaira(booking.price.amount)}–${formatNaira(booking.price.amountMax ?? booking.price.amount)}`
        : `From ${formatNaira(booking.price.amount)}`;

  const needsAction = booking.status === "pending" && role === "provider";

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border bg-white transition-shadow hover:shadow-md",
        needsAction && highlightsPending ? "border-warning-200" : "border-neutral-200"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
          {booking.serviceImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={booking.serviceImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-neutral-400">
              {/* initials */}
              {booking.serviceName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-bold text-neutral-900">
              {booking.serviceName}
            </p>
            <BookingStatusBadge status={booking.status} />
            {booking.status === "completed" && (
              <FulfillmentStatusBadge
                status={booking.fulfillment.confirmationStatus}
                perspective={role}
              />
            )}
          </div>
          <div className="mt-1">
            <BookingDateTime booking={booking} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0 text-neutral-400" aria-hidden />
              <span className="truncate">{booking.location.label}</span>
            </span>
            {role === "customer" ? (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3 text-neutral-400" aria-hidden />
                {booking.provider?.displayName ?? "Service provider"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3 text-neutral-400" aria-hidden />
                {booking.customer.name}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-neutral-900">{priceLabel}</p>
          {needsAction && highlightsPending && (
            <p className="mt-0.5 text-[11px] font-semibold text-warning-600">
              Awaiting confirmation
            </p>
          )}
          <span className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-600">
            View <ArrowRight className="h-3 w-3" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}