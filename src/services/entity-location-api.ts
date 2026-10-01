import { apiClient, type ApiError } from "@/lib/api-client";
import type { PickedLocation } from "@/lib/maps/types";

// ============================================================
// LOCATION + DISCOVERABILITY OF AN ENTITY THE USER OWNS — LIVE API
// ============================================================
//   GET/PUT/DELETE /locations/entities/:type/:id
//   PATCH          /locations/entities/:type/:id/visibility
// Ownership is enforced by the server.

export type EntityType = "VENDOR" | "FREELANCER" | "SERVICE_PROVIDER" | "EVENT";
export type LocationVisibility = "PRIVATE" | "APPROXIMATE" | "DISCOVERABLE";

export interface EntityLocation {
  entityType: EntityType;
  entityId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  source: string;
  visibility: LocationVisibility;
  /** What the public sees; null while PRIVATE. */
  publicLocation: { latitude: number; longitude: number } | null;
  campusId: string | null;
  updatedAt: string;
}

const path = (type: EntityType, id: string) => `/locations/entities/${type}/${encodeURIComponent(id)}`;

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function fetchEntityLocation(type: EntityType, id: string): Promise<EntityLocation | null> {
  return (await unwrap(apiClient.get<EntityLocation | null>(path(type, id)))) ?? null;
}

export function toEntityLocationBody(location: PickedLocation, visibility: LocationVisibility, campusId?: string | null) {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    source: location.source,
    accuracyMeters: location.accuracyMeters,
    campusId: campusId ?? null,
    visibility,
  };
}

export async function saveEntityLocation(
  type: EntityType,
  id: string,
  location: PickedLocation,
  visibility: LocationVisibility,
  campusId?: string | null,
): Promise<EntityLocation> {
  const body = toEntityLocationBody(location, visibility, campusId);
  return unwrap(apiClient.put<typeof body, EntityLocation>(path(type, id), body));
}

export async function updateEntityVisibility(
  type: EntityType,
  id: string,
  visibility: LocationVisibility,
): Promise<EntityLocation> {
  return unwrap(apiClient.patch<{ visibility: LocationVisibility }, EntityLocation>(`${path(type, id)}/visibility`, { visibility }));
}

export async function deleteEntityLocation(type: EntityType, id: string): Promise<void> {
  const { error } = await apiClient.delete(path(type, id));
  if (error) throw error;
}
