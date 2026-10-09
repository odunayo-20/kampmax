import { Campus } from "@/types";
import { campuses as defaultCampuses } from "@/data/campus";
import { getDevicePosition, DevicePosition } from "@/lib/maps/geolocation";
import { DeviceLocationError } from "@/lib/maps/types";

export interface CampusDistanceResult {
  campus: Campus;
  distanceKm: number;
  formattedDistance: string;
  isCloseProximity: boolean; // within maxProximityThresholdKm
}

export interface GeolocationDetectionResult {
  status: "success" | "denied" | "timeout" | "unsupported" | "too_far" | "error";
  userCoords: { latitude: number; longitude: number } | null;
  detectedCampus: Campus | null;
  distanceKm: number | null;
  formattedDistance: string | null;
  promptMessage: string | null;
  errorMessage: string | null;
}

/**
 * Calculates great-circle distance between two points using the Haversine formula (km).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in kilometers for friendly display.
 */
export function formatCampusDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m away`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  return `${Math.round(distanceKm)} km away`;
}

/**
 * Finds the nearest campus to a set of coordinates.
 */
export function findNearestCampus(
  coords: { latitude: number; longitude: number },
  campusList: Campus[] = defaultCampuses,
  maxProximityThresholdKm: number = 40
): CampusDistanceResult | null {
  const campusesWithCoords = campusList.filter(
    (c): c is Campus & { coordinates: { latitude: number; longitude: number } } =>
      Boolean(c.coordinates && typeof c.coordinates.latitude === "number")
  );

  if (campusesWithCoords.length === 0) return null;

  let best: CampusDistanceResult | null = null;

  for (const campus of campusesWithCoords) {
    const dist = calculateHaversineDistanceKm(
      coords.latitude,
      coords.longitude,
      campus.coordinates.latitude,
      campus.coordinates.longitude
    );

    if (!best || dist < best.distanceKm) {
      best = {
        campus,
        distanceKm: dist,
        formattedDistance: formatCampusDistance(dist),
        isCloseProximity: dist <= maxProximityThresholdKm,
      };
    }
  }

  return best;
}

/**
 * Backend campuses are only as good as the data admins entered; when one has no
 * coordinates, borrow them from the built-in directory (matched by id,
 * abbreviation or name) so GPS detection still works.
 */
function withFallbackCoordinates(campusList: Campus[]): Campus[] {
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  return campusList.map((c) => {
    if (c.coordinates) return c;
    const known = defaultCampuses.find(
      (d) =>
        d.coordinates &&
        (norm(d.id) === norm(c.id) ||
          norm(d.abbreviation) === norm(c.abbreviation) ||
          norm(d.name) === norm(c.name))
    );
    return known ? { ...c, coordinates: known.coordinates } : c;
  });
}

/**
 * One-click browser geolocation detector that identifies if the student is currently
 * at or near a supported campus.
 */
export async function detectCampusFromGeolocation(
  campusList: Campus[] = defaultCampuses,
  maxProximityThresholdKm: number = 40,
  devicePositionResolver?: () => Promise<DevicePosition>
): Promise<GeolocationDetectionResult> {
  try {
    const position = devicePositionResolver
      ? await devicePositionResolver()
      : await getDevicePosition();

    const coords = {
      latitude: position.latitude,
      longitude: position.longitude,
    };

    const nearest = findNearestCampus(
      coords,
      withFallbackCoordinates(campusList),
      maxProximityThresholdKm
    );

    if (!nearest) {
      return {
        status: "too_far",
        userCoords: coords,
        detectedCampus: null,
        distanceKm: null,
        formattedDistance: null,
        promptMessage: null,
        errorMessage: "No campuses with coordinates found in directory.",
      };
    }

    if (!nearest.isCloseProximity) {
      return {
        status: "too_far",
        userCoords: coords,
        detectedCampus: nearest.campus,
        distanceKm: nearest.distanceKm,
        formattedDistance: nearest.formattedDistance,
        promptMessage: null,
        errorMessage: `Nearest campus (${nearest.campus.name}) is ${nearest.formattedDistance}. Please choose from the list.`,
      };
    }

    return {
      status: "success",
      userCoords: coords,
      detectedCampus: nearest.campus,
      distanceKm: nearest.distanceKm,
      formattedDistance: nearest.formattedDistance,
      promptMessage: `Are you currently at ${nearest.campus.name}? Tap to select.`,
      errorMessage: null,
    };
  } catch (err: unknown) {
    if (err instanceof DeviceLocationError) {
      return {
        status: err.code === "denied" ? "denied" : err.code === "timeout" ? "timeout" : "unsupported",
        userCoords: null,
        detectedCampus: null,
        distanceKm: null,
        formattedDistance: null,
        promptMessage: null,
        errorMessage: err.message,
      };
    }

    return {
      status: "error",
      userCoords: null,
      detectedCampus: null,
      distanceKm: null,
      formattedDistance: null,
      promptMessage: null,
      errorMessage:
        err instanceof Error ? err.message : "Unable to retrieve your location.",
    };
  }
}
