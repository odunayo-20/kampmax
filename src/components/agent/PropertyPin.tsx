"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import type { PickedLocation } from "@/lib/maps/types";

export interface Pin {
  latitude: number;
  longitude: number;
}

/**
 * Where a property is on the map. The same control serves the "add property" form
 * (the pin is kept until the form is saved) and a saved property (`onChange` saves it
 * straight away). Students only ever see an approximate point, never the door.
 */
export function PropertyPin({
  value,
  onChange,
  saving = false,
}: {
  value: Pin | null;
  onChange: (pin: Pin) => unknown;
  saving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial: PickedLocation | null = value && {
    ...value,
    source: "MANUAL",
    accuracyMeters: null,
    country: null,
    state: null,
    city: null,
    area: null,
    formattedAddress: null,
  };

  async function confirm({ latitude, longitude }: PickedLocation) {
    setError(null);
    try {
      await onChange({ latitude, longitude });
      setOpen(false);
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-kampmax-blue" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-wider text-kampmax-blue">Map pin</p>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              value ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {value ? "Pinned" : "Not pinned yet"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((c) => !c)}
          className="text-xs font-semibold text-kampmax-blue hover:underline"
        >
          {open ? "Close map" : value ? "Change pin" : "Pin on map"}
        </button>
      </div>
      <p className="mt-1 text-xs text-kampmax-text-secondary">
        Pinned places show a map and the distance to campus, and get more enquiries. Students see an
        approximate spot only. Your exact address stays private.
      </p>
      {open && (
        <div className="mt-3">
          <LocationPicker
            initial={initial}
            onConfirm={confirm}
            saving={saving}
            saveError={error}
            confirmLabel="Use this spot"
          />
        </div>
      )}
    </div>
  );
}
