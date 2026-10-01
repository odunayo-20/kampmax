"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import type { PickedLocation } from "@/lib/maps/types";
import {
  useDeleteEntityLocation,
  useEntityLocation,
  useSaveEntityLocation,
  useUpdateEntityVisibility,
} from "@/hooks/use-entity-location";
import type { EntityType, LocationVisibility } from "@/services/entity-location-api";

const OPTIONS: { value: LocationVisibility; label: string; hint: string }[] = [
  { value: "PRIVATE", label: "Private", hint: "Not shown in Nearby. Only you can see this location." },
  { value: "APPROXIMATE", label: "Approximate", hint: "Shown within about a kilometre of the real spot. Your exact position is never shared." },
  { value: "DISCOVERABLE", label: "Discoverable", hint: "Shown at your location to within roughly 10 metres. Use this for a shop or venue people should find." },
];

interface Props {
  entityType: EntityType;
  entityId: string;
  /** Shown to explain what is being located, e.g. "your store". */
  noun?: string;
}

/**
 * Location + visibility for an entity the signed-in user owns. All
 * enforcement (ownership, defaults, precision) happens on the server.
 */
export function EntityLocationSettings({ entityType, entityId, noun = "this listing" }: Props) {
  const query = useEntityLocation(entityType, entityId);
  const save = useSaveEntityLocation(entityType, entityId);
  const setVisibility = useUpdateEntityVisibility(entityType, entityId);
  const remove = useDeleteEntityLocation(entityType, entityId);
  const saved = query.data ?? null;

  const [choice, setChoice] = useState<LocationVisibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const visibility = choice ?? saved?.visibility ?? "PRIVATE";

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      setChoice(null);
      setNotice(done);
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    }
  }

  if (query.isLoading) {
    return (
      <p role="status" className="py-6 text-center text-sm text-kampmax-text-secondary">
        Loading location settings…
      </p>
    );
  }
  if (query.isError) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-6 text-center">
        <p className="text-sm text-kampmax-text">Couldn&apos;t load the location settings.</p>
        <button type="button" onClick={() => query.refetch()} className="mt-2 text-sm font-medium text-kampmax-blue">
          Try again
        </button>
      </div>
    );
  }

  const isSavedValid = Boolean(
    saved &&
      typeof saved.latitude === "number" &&
      typeof saved.longitude === "number" &&
      !isNaN(saved.latitude) &&
      !isNaN(saved.longitude),
  );

  const initial: PickedLocation | null = isSavedValid && saved
    ? {
        latitude: saved.latitude,
        longitude: saved.longitude,
        source: saved.source === "DEVICE" ? "DEVICE" : "MANUAL",
        accuracyMeters: typeof saved.accuracyMeters === "number" ? saved.accuracyMeters : null,
        country: null,
        state: null,
        city: null,
        area: null,
        formattedAddress: null,
      }
    : null;

  return (
    <div className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-kampmax-text">Who can find {noun} on the map</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 has-[:checked]:border-primary-600">
            <input
              type="radio"
              name={`visibility-${entityId}`}
              value={o.value}
              checked={visibility === o.value}
              onChange={() => setChoice(o.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-kampmax-text">{o.label}</span>
              <span className="block text-xs text-kampmax-text-secondary">{o.hint}</span>
            </span>
          </label>
        ))}
        {saved && visibility !== saved.visibility && (
          <Button
            type="button"
            onClick={() => run(() => setVisibility.mutateAsync(visibility), "Visibility updated.")}
            disabled={setVisibility.isPending}
          >
            {setVisibility.isPending ? "Saving…" : "Save visibility"}
          </Button>
        )}
        {!saved && <p className="text-xs text-kampmax-text-secondary">Choose a location below to apply this setting. New locations start as Private.</p>}
      </fieldset>

      <div>
        <h2 className="mb-3 text-sm font-medium text-kampmax-text">{saved ? "Change location" : "Set location"}</h2>
        <LocationPicker
          key={saved?.updatedAt ?? "empty"}
          initial={initial}
          saving={save.isPending}
          saveError={error}
          confirmLabel={saved ? "Update location" : "Save location"}
          onConfirm={(location) => run(() => save.mutateAsync({ location, visibility }), "Location saved.")}
        />
      </div>

      {notice && (
        <p role="status" className="text-sm text-kampmax-text">
          {notice}
        </p>
      )}

      {saved && (
        <div className="border-t border-neutral-200 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => run(() => remove.mutateAsync(undefined), "Location removed.")}
            disabled={remove.isPending}
          >
            {remove.isPending ? "Removing…" : "Remove location"}
          </Button>
        </div>
      )}
    </div>
  );
}
