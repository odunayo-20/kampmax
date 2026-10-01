import {
  GEOCODING_COUNTRIES,
  MAPTILER_API_KEY,
  MAPTILER_BASE_URL,
  isMapConfigured,
} from "../config";
import { GeocodingError, type GeocodeResult, type LatLng } from "../types";

// MapTiler Geocoding API (GeoJSON). Docs: https://docs.maptiler.com/cloud/api/geocoding/

interface MapTilerContext {
  id?: string;
  text?: string;
}

interface MapTilerFeature {
  id?: string;
  text?: string;
  place_name?: string;
  place_type?: string[];
  center?: [number, number];
  context?: MapTilerContext[];
}

interface MapTilerResponse {
  features?: MapTilerFeature[];
}

interface Options {
  signal?: AbortSignal;
  /** Bias results toward this point. */
  proximity?: LatLng;
  limit?: number;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

const clean = (v: string | undefined | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

/** Pick the first value whose MapTiler place-type prefix matches one of `types`. */
function pick(feature: MapTilerFeature, types: string[]): string | null {
  const own = feature.id?.split(".")[0];
  if (own && types.includes(own)) return clean(feature.text);
  for (const c of feature.context ?? []) {
    const kind = c.id?.split(".")[0];
    if (kind && types.includes(kind)) return clean(c.text);
  }
  return null;
}

export function parseFeature(feature: MapTilerFeature, index = 0): GeocodeResult | null {
  const [lng, lat] = feature.center ?? [];
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    id: feature.id ?? `feature-${index}`,
    label: clean(feature.place_name) ?? clean(feature.text) ?? "Unnamed place",
    latitude: lat,
    longitude: lng,
    country: pick(feature, ["country"]),
    state: pick(feature, ["region"]),
    city: pick(feature, ["municipality", "place", "county", "joint_municipality"]),
    area: pick(feature, ["neighbourhood", "locality", "subregion", "address"]),
  };
}

async function request(path: string, params: URLSearchParams, opts: Options): Promise<GeocodeResult[]> {
  const key = opts.apiKey ?? MAPTILER_API_KEY;
  if (!isMapConfigured(key)) {
    throw new GeocodingError("not_configured", "Map search isn't configured.");
  }
  params.set("key", key);
  const doFetch = opts.fetchImpl ?? fetch;

  let res: Response;
  try {
    res = await doFetch(`${MAPTILER_BASE_URL}/geocoding/${path}.json?${params.toString()}`, {
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new GeocodingError("network", "Couldn't reach the map service. Check your connection.");
  }
  if (!res.ok) {
    throw new GeocodingError("http", "The map service couldn't complete that request.");
  }

  let body: MapTilerResponse;
  try {
    body = (await res.json()) as MapTilerResponse;
  } catch {
    throw new GeocodingError("bad_response", "The map service returned an unexpected response.");
  }
  if (!Array.isArray(body.features)) {
    throw new GeocodingError("bad_response", "The map service returned an unexpected response.");
  }
  return body.features.map(parseFeature).filter((r): r is GeocodeResult => r !== null);
}

/** Forward geocoding: free-text query → candidate places. */
export async function searchPlaces(query: string, opts: Options = {}): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    limit: String(opts.limit ?? 5),
    language: "en",
    autocomplete: "true",
  });
  if (GEOCODING_COUNTRIES.length) params.set("country", GEOCODING_COUNTRIES.join(","));
  if (opts.proximity) params.set("proximity", `${opts.proximity.longitude},${opts.proximity.latitude}`);
  return request(encodeURIComponent(q), params, opts);
}

/** Reverse geocoding: coordinates → best matching place (or null). */
export async function reverseGeocode(point: LatLng, opts: Options = {}): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ limit: "1", language: "en" });
  const results = await request(`${point.longitude},${point.latitude}`, params, opts);
  return results[0] ?? null;
}
