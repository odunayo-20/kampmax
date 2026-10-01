/** Provider-agnostic map/location types. UI code depends on these, never on MapTiler payloads. */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export type LocationSource = "DEVICE" | "MANUAL";

/** A location chosen in the picker; maps 1:1 onto the Kampmax location API body. */
export interface PickedLocation extends LatLng {
  source: LocationSource;
  /** Device accuracy radius in metres; null when the browser gave none. */
  accuracyMeters: number | null;
  country: string | null;
  state: string | null;
  city: string | null;
  area: string | null;
  formattedAddress: string | null;
}

/** A geocoding result before the user has chosen it. */
export interface GeocodeResult extends LatLng {
  id: string;
  label: string;
  country: string | null;
  state: string | null;
  city: string | null;
  area: string | null;
}

export type GeocodingErrorCode = "not_configured" | "network" | "http" | "bad_response";

export class GeocodingError extends Error {
  constructor(
    public readonly code: GeocodingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GeocodingError";
  }
}

export type GeolocationErrorCode = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";

export class DeviceLocationError extends Error {
  constructor(
    public readonly code: GeolocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DeviceLocationError";
  }
}
