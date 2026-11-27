"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, AlertCircle, RefreshCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeRescheduleError, rescheduleNote } from "@/lib/my-bookings-list";
import { fetchBookingAvailability, rescheduleBooking } from "@/services/booking";
import { BookingDayPicker } from "./BookingDayPicker";
import { BookingTimeSlotGrid } from "./BookingTimeSlotGrid";
import type { BookingSlot, ServiceBooking } from "@/types/booking";

export function RescheduleModal({
  booking,
  onClose,
  onComplete,
}: {
  booking: ServiceBooking;
  onClose: () => void;
  onComplete: (updated: ServiceBooking) => void;
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // One key per chosen time: a retry of the same move is safe, a different time is a new move.
  const keyRef = useRef<{ startAt: string; key: string } | null>(null);
  const note = rescheduleNote(booking.bookingPreference);

  const availabilityQuery = useQuery({
    queryKey: ["booking-availability", booking.serviceId],
    queryFn: () => fetchBookingAvailability(booking.serviceId),
    retry: false,
    staleTime: 0,
  });
  const availability = availabilityQuery.data;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (selectedDate || !availability) return;
    setSelectedDate(
      availability.days.find((d) => d.available)?.date ?? availability.days[0]?.date ?? ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability, selectedDate]);

  const selectedDay = availability?.days.find((d) => d.date === selectedDate);

  async function submit() {
    if (!selectedSlot || busy) return;
    setBusy(true);
    setError("");
    const startAt = selectedSlot.startAt;
    if (keyRef.current?.startAt !== startAt) {
      keyRef.current = { startAt, key: `bk_resched_${Date.now()}_${Math.floor(Math.random() * 1e9)}` };
    }
    const result = await rescheduleBooking({ id: booking.id, startAt, idempotencyKey: keyRef.current.key });
    setBusy(false);
    if (result.ok) {
      onComplete(result.booking);
      return;
    }
    const failure = describeRescheduleError(result.error.code, result.error.message);
    setError(failure.message);
    if (failure.kind === "taken") {
      setSelectedSlot(null);
      void availabilityQuery.refetch(); // the taken time greys out
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-booking-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-primary-600" />
            <h2 id="reschedule-booking-title" className="text-sm font-bold text-neutral-900">
              Reschedule {booking.serviceName}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {availabilityQuery.isPending ? (
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading available times…
            </p>
          ) : !availability ? (
            <div role="alert" className="text-xs text-neutral-500">
              {availabilityQuery.isError ? (
                <>
                  Couldn&apos;t load the free times. Check your connection.{" "}
                  <button type="button" onClick={() => void availabilityQuery.refetch()} className="font-semibold text-primary-600 hover:underline">
                    Try again
                  </button>
                </>
              ) : (
                "This service can no longer be booked online. Message the provider instead."
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-neutral-600">
                Pick a new time. Your current time stays booked until the move goes through. {note}
              </p>

              {error && (
                <p
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-2.5 text-xs text-error-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{error}</span>
                </p>
              )}

              <div className="mt-3">
                <BookingDayPicker
                  days={availability.days}
                  selectedDate={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  timeZone={availability.timeZone}
                />
              </div>

              {selectedDay?.available && (
                <div className="mt-3">
                  <BookingTimeSlotGrid
                    day={selectedDay}
                    selectedStartAt={selectedSlot?.startAt ?? ""}
                    onSelect={setSelectedSlot}
                  />
                </div>
              )}
              {selectedDay && !selectedDay.available && (
                <p className="mt-3 text-xs text-neutral-500">{selectedDay.reasonLabel}</p>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-neutral-100 p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Keep current time
          </button>
          <button
            onClick={submit}
            disabled={!selectedSlot || busy}
            className={cn(
              "flex flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-bold text-white transition-colors",
              !selectedSlot || busy
                ? "cursor-not-allowed bg-neutral-300"
                : "bg-primary-600 hover:bg-primary-700"
            )}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> Saving…
              </>
            ) : (
              "Confirm new time"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}