import { DeviceLocationError, type LatLng } from "./types";

export interface DevicePosition extends LatLng {
  /** Null when the browser doesn't report accuracy — never fabricated. */
  accuracyMeters: number | null;
}

/**
 * One-shot browser geolocation. Only call this from an explicit user action
 * (button click); it never runs automatically and never watches position.
 */
export function getDevicePosition(
  geo: Geolocation | undefined = typeof navigator === "undefined" ? undefined : navigator.geolocation,
): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (!geo) {
      reject(new DeviceLocationError("unsupported", "Your browser doesn't support location."));
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      reject(new DeviceLocationError("insecure", "Location needs a secure (HTTPS) connection."));
      return;
    }
    const onSuccess: PositionCallback = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      resolve({
        latitude,
        longitude,
        accuracyMeters: typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null,
      });
    };
    const onFailure: PositionErrorCallback = (err) => {
      // PERMISSION_DENIED = 1 also covers the user dismissing the prompt.
      if (err.code === 1) {
        reject(new DeviceLocationError("denied", "Location permission was denied. You can allow it in your browser settings, or search instead."));
      } else if (err.code === 3) {
        reject(new DeviceLocationError("timeout", "Finding your location took too long. Try again or search instead."));
      } else {
        reject(new DeviceLocationError("unavailable", "Your location isn't available right now. Try searching instead."));
      }
    };
    // Desktops have no GPS, so a high-accuracy request just waits and times out.
    // Try the fast Wi-Fi/IP lookup first and only ask for a precise fix if that fails.
    geo.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === 1) return onFailure(err);
        geo.getCurrentPosition(onSuccess, onFailure, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  });
}
