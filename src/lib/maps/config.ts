/**
 * Central map configuration. Every MapTiler URL and default lives here so
 * UI components never build provider URLs themselves.
 *
 * NEXT_PUBLIC_MAPTILER_API_KEY is a browser-exposed key by design: restrict it
 * by allowed HTTP origins in the MapTiler dashboard. Never put a private/secret
 * key in a NEXT_PUBLIC_ variable.
 */

export const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim() ?? "";

export const MAPTILER_BASE_URL = "https://api.maptiler.com";

/** MapTiler style id (a MapLibre-compatible style.json). */
export const MAP_STYLE_ID = "streets-v2";

/** Kampmax launches in Nigeria; used as the initial view and a geocoding bias. */
export const DEFAULT_MAP_CENTER = { latitude: 9.082, longitude: 8.6753 };
export const DEFAULT_MAP_ZOOM = 5;
export const SELECTED_LOCATION_ZOOM = 15;

export const GEOCODING_COUNTRIES = ["ng"];

export function isMapConfigured(key: string = MAPTILER_API_KEY): boolean {
  return key.length > 0;
}

export function getMapStyleUrl(key: string = MAPTILER_API_KEY): string {
  return `${MAPTILER_BASE_URL}/maps/${MAP_STYLE_ID}/style.json?key=${encodeURIComponent(key)}`;
}
