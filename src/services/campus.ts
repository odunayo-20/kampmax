import { Campus } from "@/types";
import { campuses as mockCampuses, defaultCampus as mockDefaultCampus } from "@/data/campus";
import { apiClient, ApiError } from "@/lib/api-client";

// ============================================================
// BACKEND RESPONSE TYPES (from NestJS Campuses Module)
// ============================================================

export interface BackendCampusListItem {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  country: string;
  logo: string | null;
  coverImage: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  memberCount: number;
  createdAt: string;
}

export interface BackendCampusDetail {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  country: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackendPaginatedCampuses {
  items: BackendCampusListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CampusMembershipInfo {
  id: string;
  userId: string;
  campusId: string;
  status: "ACTIVE" | "PENDING" | "REJECTED";
  joinedAt: string | null;
  createdAt: string;
}

// In-memory cache for synchronous fallback access
let cachedCampuses: Campus[] = [...mockCampuses];

/**
 * Maps a backend campus item (list item or detail) to the frontend Campus model.
 */
export function mapBackendCampusToFrontend(
  raw: Partial<BackendCampusListItem & BackendCampusDetail>
): Campus {
  const locationParts = [raw.city, raw.state].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : (raw.country || "");
  const abbreviation = raw.slug ? raw.slug.toUpperCase() : raw.name?.slice(0, 6).toUpperCase() || "";

  // Check if matching mock campus has preconfigured departments
  const existing = mockCampuses.find(
    (m) => m.id === raw.id || m.id === raw.slug || m.name.toLowerCase() === raw.name?.toLowerCase()
  );

  return {
    id: raw.id || raw.slug || "",
    name: raw.name || "",
    abbreviation: existing?.abbreviation || abbreviation,
    location: existing?.location || location,
    departments: existing?.departments || [],
    imageUrl: raw.coverImage || raw.logo || existing?.imageUrl || undefined,
  };
}

// ============================================================
// ASYNC API CLIENT METHODS
// ============================================================

export interface FetchCampusesParams {
  search?: string;
  state?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch paginated campuses from the backend API.
 * GET /api/v1/campuses
 */
export async function fetchCampuses(
  params: FetchCampusesParams = {}
): Promise<{ data: Campus[]; total: number; page: number; limit: number; totalPages: number; error: ApiError | null }> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("search", params.search);
  if (params.state) searchParams.append("state", params.state);
  if (params.status) searchParams.append("status", params.status);
  if (params.page) searchParams.append("page", String(params.page));
  if (params.limit) searchParams.append("limit", String(params.limit));

  const queryString = searchParams.toString();
  const path = `/campuses${queryString ? `?${queryString}` : ""}`;

  const { data, error } = await apiClient.get<BackendPaginatedCampuses>(path);

  if (error || !data || !Array.isArray(data.items)) {
    // If backend request fails, return cached campuses
    return {
      data: cachedCampuses,
      total: cachedCampuses.length,
      page: 1,
      limit: cachedCampuses.length,
      totalPages: 1,
      error,
    };
  }

  const mapped = data.items.map(mapBackendCampusToFrontend);
  if (mapped.length > 0 && !params.search && !params.state) {
    cachedCampuses = mapped;
  }

  return {
    data: mapped,
    total: data.meta?.total ?? mapped.length,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? mapped.length,
    totalPages: data.meta?.totalPages ?? 1,
    error: null,
  };
}

/**
 * Fetch a single campus by its slug or ID.
 * GET /api/v1/campuses/:slug
 */
export async function fetchCampusBySlug(
  slug: string
): Promise<{ data: Campus | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendCampusDetail>(`/campuses/${slug}`);

  if (error || !data) {
    const fallback = cachedCampuses.find((c) => c.id === slug || c.abbreviation.toLowerCase() === slug.toLowerCase());
    return { data: fallback || null, error };
  }

  return { data: mapBackendCampusToFrontend(data), error: null };
}

/**
 * Join a campus membership.
 * POST /api/v1/campuses/:id/join
 */
export async function joinCampus(
  campusId: string
): Promise<{ data: CampusMembershipInfo | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<Record<string, never>, CampusMembershipInfo>(
    `/campuses/${campusId}/join`,
    {}
  );
  return { data, error };
}

/**
 * Leave a campus membership.
 * DELETE /api/v1/campuses/:id/leave
 */
export async function leaveCampus(
  campusId: string
): Promise<{ success: boolean; error: ApiError | null }> {
  const { error } = await apiClient.delete<Record<string, unknown>>(`/campuses/${campusId}/leave`);
  return { success: !error, error };
}

/**
 * Get current user's membership in a specific campus.
 * GET /api/v1/campuses/:id/membership
 */
export async function getMyCampusMembership(
  campusId: string
): Promise<{ data: CampusMembershipInfo | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<CampusMembershipInfo>(`/campuses/${campusId}/membership`);
  return { data, error };
}

// ============================================================
// SYNCHRONOUS CONVENIENCE HELPERS (Backward compatibility)
// ============================================================

export function getCampuses(): Campus[] {
  return cachedCampuses;
}

export function getDefaultCampus(): Campus {
  return cachedCampuses[0] || mockDefaultCampus;
}

export function getCampusById(id: string): Campus | undefined {
  return cachedCampuses.find((c) => c.id === id);
}
