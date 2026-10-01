"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LocateFixed, Search } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/ui/Input";
import { useDebounce } from "@/hooks/use-debounce";
import { MapView } from "@/components/maps/MapView";
import { getDevicePosition } from "@/lib/maps/geolocation";
import { reverseGeocode, searchPlaces } from "@/lib/maps/maptiler/geocoding";
import {
  DeviceLocationError,
  GeocodingError,
  type GeocodeResult,
  type LatLng,
  type PickedLocation,
} from "@/lib/maps/types";

export interface LocationPickerProps {
  /** Starting selection (e.g. a saved location). */
  initial?: PickedLocation | null;
  /** Called with the confirmed location. May be async; the picker shows `saving` state. */
  onConfirm: (location: PickedLocation) => void | Promise<void>;
  saving?: boolean;
  /** Error from the confirm/save step, shown beneath the button. */
  saveError?: string | null;
  confirmLabel?: string;
}

const SEARCH_DEBOUNCE_MS = 400;
const MIN_AUTO_SEARCH_CHARS = 3;

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

function geocodingMessage(e: unknown, fallback: string): string {
  if (e instanceof GeocodingError) return e.message;
  return fallback;
}

function fromResult(r: GeocodeResult): PickedLocation {
  return {
    latitude: r.latitude,
    longitude: r.longitude,
    source: "MANUAL",
    accuracyMeters: null,
    country: r.country,
    state: r.state,
    city: r.city,
    area: r.area,
    formattedAddress: r.label,
  };
}

function describe(loc: PickedLocation): string {
  return loc.formattedAddress ?? [loc.area, loc.city, loc.state, loc.country].filter(Boolean).join(", ");
}

/**
 * Reusable location picker: device location, place search, or click/drag on the
 * map. It only reports a selection via `onConfirm`; persistence is the caller's job.
 */
export function LocationPicker({ initial = null, onConfirm, saving = false, saveError = null, confirmLabel = "Confirm location" }: LocationPickerProps) {
  const [selected, setSelected] = useState<PickedLocation | null>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const reverseAbort = useRef<AbortController | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  });

  useEffect(
    () => () => {
      searchAbort.current?.abort();
      reverseAbort.current?.abort();
    },
    [],
  );

  /** Fill in the human-readable parts for a raw point. Failure keeps the coordinates. */
  const resolvePoint = useCallback(async (point: LatLng, base: Pick<PickedLocation, "source" | "accuracyMeters">) => {
    reverseAbort.current?.abort();
    const controller = new AbortController();
    reverseAbort.current = controller;
    setSelected({ ...point, ...base, country: null, state: null, city: null, area: null, formattedAddress: null });
    setResolving(true);
    try {
      const place = await reverseGeocode(point, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setSelected({
        ...point,
        ...base,
        country: place?.country ?? null,
        state: place?.state ?? null,
        city: place?.city ?? null,
        area: place?.area ?? null,
        formattedAddress: place?.label ?? null,
      });
    } catch (e) {
      if (isAbort(e)) return;
      setError(`${geocodingMessage(e, "Couldn't look up that spot's name.")} Your coordinates were still captured.`);
    } finally {
      if (reverseAbort.current === controller) setResolving(false);
    }
  }, []);

  async function useCurrentLocation() {
    setError(null);
    setLocating(true);
    try {
      const pos = await getDevicePosition();
      await resolvePoint(pos, { source: "DEVICE", accuracyMeters: pos.accuracyMeters });
    } catch (e) {
      setError(e instanceof DeviceLocationError ? e.message : "Couldn't get your location. Try searching instead.");
    } finally {
      setLocating(false);
    }
  }

  const runSearch = useCallback(async (text: string) => {
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setSearching(true);
    try {
      const found = await searchPlaces(text, { signal: controller.signal, proximity: selectedRef.current ?? undefined });
      if (controller.signal.aborted) return;
      setResults(found);
      setError(null);
    } catch (err) {
      if (isAbort(err)) return;
      setResults(null);
      setError(geocodingMessage(err, "Search failed. Please try again."));
    } finally {
      if (searchAbort.current === controller) setSearching(false);
    }
  }, []);

  // Search while typing, debounced; Enter/Search button searches immediately.
  const debouncedQuery = useDebounce(query.trim(), SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    if (debouncedQuery.length < MIN_AUTO_SEARCH_CHARS) {
      searchAbort.current?.abort();
      setSearching(false);
      setResults(null);
      return;
    }
    void runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    setError(null);
    void runSearch(query);
  }

  function choose(r: GeocodeResult) {
    reverseAbort.current?.abort();
    setResolving(false);
    setSelected(fromResult(r));
    setResults(null);
    setError(null);
  }

  const busy = locating || resolving;

  return (
    <div className="space-y-4">
      <div>
        <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating || saving}>
          <LocateFixed className="mr-2 h-4 w-4" aria-hidden />
          {locating ? "Finding your location…" : "Use my current location"}
        </Button>
      </div>

      <form onSubmit={submitSearch} className="flex items-end gap-2" role="search">
        <div className="flex-1">
          <Input
            label="Search for a location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Owo, Ondo State"
            autoComplete="off"
            maxLength={150}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={searching || saving} aria-label="Search">
          <Search className="h-4 w-4 sm:mr-2" aria-hidden />
          <span className="hidden sm:inline">{searching ? "Searching…" : "Search"}</span>
        </Button>
      </form>

      {results && (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white" aria-label="Search results">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-neutral-500">No places found. Try a different search.</li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="w-full px-3 py-3 text-left text-sm text-neutral-800 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
                >
                  {r.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <MapView
        marker={selected}
        onSelect={(p) => void resolvePoint(p, { source: "MANUAL", accuracyMeters: null })}
        draggable
        ariaLabel="Map. Click or drag the marker to choose a location."
      />
      <p className="text-xs text-neutral-500">Click the map or drag the marker to fine-tune the spot.</p>

      <div aria-live="polite" className="min-h-[2.5rem]">
        {selected ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Selected location</p>
            <p className="mt-0.5 text-sm text-neutral-900">
              {resolving ? "Looking up address…" : describe(selected) || `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`}
            </p>
            {selected.accuracyMeters !== null && (
              <p className="text-xs text-neutral-500">Accurate to about {Math.round(selected.accuracyMeters)} m</p>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">No location selected yet.</p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-error-600">
          {error}
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-sm text-error-600">
          {saveError}
        </p>
      )}

      <Button type="button" onClick={() => selected && void onConfirm(selected)} disabled={!selected || busy || saving}>
        {saving ? "Saving…" : confirmLabel}
      </Button>
    </div>
  );
}
