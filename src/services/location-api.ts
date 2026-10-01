import { apiClient, type ApiError } from "@/lib/api-client";
import type { PickedLocation } from "@/lib/maps/types";

// ============================================================
// MY PROFILE LOCATION — LIVE API
// ============================================================
//   GET/PUT/DELETE /users/me/location
// Owner-only on the server; the user is taken from the auth token.

export interface MyLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  source: string;
  country: string | null;
  state: string | null;
  city: string | null;
  area: string | null;
  formattedAddress: string | null;
  campusId: string | null;
  updatedAt: string;
}

export interface SaveLocationInput extends PickedLocation {
  campusId?: string | null;
}

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function fetchMyLocation(): Promise<MyLocation | null> {
  return (await unwrap(apiClient.get<MyLocation | null>("/users/me/location"))) ?? null;
}

/** Explicit field list so nothing extra from UI state is ever sent to the API. */
export function toLocationBody(input: SaveLocationInput) {
  return {
    latitude: input.latitude,
    longitude: input.longitude,
    source: input.source,
    accuracyMeters: input.accuracyMeters,
    country: input.country,
    state: input.state,
    city: input.city,
    area: input.area,
    formattedAddress: input.formattedAddress,
    campusId: input.campusId ?? null,
  };
}

export async function saveMyLocation(input: SaveLocationInput): Promise<MyLocation> {
  return unwrap(apiClient.put<ReturnType<typeof toLocationBody>, MyLocation>("/users/me/location", toLocationBody(input)));
}

export async function deleteMyLocation(): Promise<void> {
  const { error } = await apiClient.delete("/users/me/location");
  if (error) throw error;
}
