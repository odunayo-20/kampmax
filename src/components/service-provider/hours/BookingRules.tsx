"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { updateSpProfileLive, type SpBookingSettings } from "@/services/service-provider-dashboard";
import {
  ADVANCE_OPTIONS,
  BOOKING_PREFERENCES,
  BUFFER_OPTIONS,
  describeHoursError,
  NOTICE_OPTIONS,
  withCurrentOption,
  type BookingPreference,
} from "@/lib/provider-hours";
import { ChoiceChips } from "./ChoiceChips";

export const SETTINGS_KEY = ["service-provider", "settings"];

/** How customers book: instantly or by request, how far ahead, and the gap between jobs. Saved with the button. */
export function BookingRules({ initial }: { initial: SpBookingSettings }) {
  const queryClient = useQueryClient();
  const [preference, setPreference] = useState<BookingPreference>(initial.bookingPreference);
  const [notice, setNotice] = useState(String(initial.minAdvanceNoticeHours));
  const [advance, setAdvance] = useState(String(initial.maxAdvanceBookingDays));
  const [buffer, setBuffer] = useState(String(initial.bufferMinutes));

  const save = useMutation({
    mutationFn: async () => {
      const res = await updateSpProfileLive({
        bookingPreference: preference,
        minAdvanceNoticeHours: Number(notice),
        maxAdvanceBookingDays: Number(advance),
        bufferMinutes: Number(buffer),
      });
      if (!res.ok) throw Object.assign(new Error(res.error), { status: res.status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });

  return (
    <section aria-labelledby="rules-title" className="space-y-5 rounded-xl border border-kampmax-border bg-white p-6">
      <h2 id="rules-title" className="text-lg font-bold text-kampmax-text">
        How customers book
      </h2>

      <div role="radiogroup" aria-label="How bookings are taken" className="grid gap-3 sm:grid-cols-2">
        {BOOKING_PREFERENCES.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={preference === o.id}
            onClick={() => setPreference(o.id)}
            className={cn(
              "rounded-lg border-2 p-4 text-left transition-colors",
              preference === o.id ? "border-primary-600 bg-primary-50" : "border-neutral-200 hover:border-primary-300"
            )}
          >
            <p className="font-semibold text-kampmax-text">{o.label}</p>
            <p className="mt-1 text-sm text-kampmax-text-secondary">{o.text}</p>
          </button>
        ))}
      </div>

      <div>
        <p className="text-sm font-medium text-kampmax-text">Minimum notice</p>
        <p className="mb-2 text-xs text-kampmax-text-muted">How far ahead a customer must book.</p>
        <ChoiceChips label="Minimum notice" options={withCurrentOption(NOTICE_OPTIONS, notice, "hours")} value={notice} onChange={setNotice} />
      </div>
      <div>
        <p className="text-sm font-medium text-kampmax-text">Book up to</p>
        <p className="mb-2 text-xs text-kampmax-text-muted">How far into the future people can book.</p>
        <ChoiceChips label="Book up to" options={withCurrentOption(ADVANCE_OPTIONS, advance, "days")} value={advance} onChange={setAdvance} />
      </div>
      <div>
        <p className="text-sm font-medium text-kampmax-text">Gap between bookings</p>
        <p className="mb-2 text-xs text-kampmax-text-muted">Time to rest or travel between jobs.</p>
        <ChoiceChips label="Gap between bookings" options={withCurrentOption(BUFFER_OPTIONS, buffer, "min")} value={buffer} onChange={setBuffer} />
      </div>

      {save.isError && (
        <p role="alert" className="text-sm text-error-600">
          {describeHoursError((save.error as Error).message, (save.error as { status?: number }).status)}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="text-sm text-success-700">
          Saved.
        </p>
      )}
      <div className="flex justify-end border-t border-kampmax-border pt-4">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}
