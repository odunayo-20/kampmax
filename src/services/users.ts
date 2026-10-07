import { User, Vendor } from "@/types";
import { users as mockUsers, getUserById as _getUserById } from "@/data/users";
import { apiClient, ApiError } from "@/lib/api-client";
import { getCurrentAuthUser } from "@/lib/current-user-store";

// ============================================================
// BACKEND RESPONSE TYPES (from NestJS Vendors Module)
// ============================================================

export type BackendVerificationStatus =
  | "PENDING"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export interface BackendVendorPublicProfile {
  id: string;
  storeName: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  phone: string | null;
  businessAddress: string | null;
  verificationStatus: BackendVerificationStatus;
  rating: number;
  totalSales: number;
  campusId: string;
  createdAt: string;
}

export interface BackendPaginatedVendors {
  items: BackendVendorPublicProfile[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// In-memory cache so sync callers (cart, storefront helpers) see live data
// once it has been fetched at least once.
let cachedVendors: Vendor[] = [];

/**
 * Maps a backend vendor public profile into the frontend Vendor model.
 */
export function mapBackendVendorToFrontend(raw: BackendVendorPublicProfile): Vendor {
  return {
    id: raw.id,
    userId: "",
    slug: raw.slug,
    storeName: raw.storeName,
    description: raw.description || "",
    rating: Number(raw.rating) || 0,
    totalSales: Number(raw.totalSales) || 0,
    verified: raw.verificationStatus === "VERIFIED",
    campusId: raw.campusId,
    specialties: [],
    logo: raw.logo || undefined,
    coverImage: raw.banner || undefined,
    responseTime: undefined,
    joinDate: raw.createdAt,
  };
}

function upsertCachedVendor(vendor: Vendor) {
  const idx = cachedVendors.findIndex((v) => v.id === vendor.id);
  if (idx >= 0) cachedVendors[idx] = vendor;
  else cachedVendors.unshift(vendor);
}

/**
 * Fetch a vendor store by slug from the backend.
 * GET /api/v1/vendors/slug/:slug
 */
export async function fetchVendorBySlug(
  slug: string
): Promise<{ data: Vendor | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendVendorPublicProfile>(
    `/vendors/slug/${encodeURIComponent(slug)}`
  );

  if (error || !data || !data.id) {
    const fallback = cachedVendors.find((v) => v.slug === slug) || null;
    return { data: fallback, error };
  }

  const mapped = mapBackendVendorToFrontend(data);
  upsertCachedVendor(mapped);
  return { data: mapped, error: null };
}

/**
 * Fetch a vendor store by ID from the backend.
 * GET /api/v1/vendors/:id
 */
export async function fetchVendorById(
  id: string
): Promise<{ data: Vendor | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendVendorPublicProfile>(`/vendors/${id}`);

  if (error || !data || !data.id) {
    const fallback = cachedVendors.find((v) => v.id === id) || null;
    return { data: fallback, error };
  }

  const mapped = mapBackendVendorToFrontend(data);
  upsertCachedVendor(mapped);
  return { data: mapped, error: null };
}

export interface FetchVendorsParams {
  search?: string;
  campusId?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch paginated vendor stores from the backend.
 * GET /api/v1/vendors
 */
export async function fetchVendors(
  params: FetchVendorsParams = {}
): Promise<{ data: Vendor[]; total: number; page: number; limit: number; totalPages: number; error: ApiError | null }> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("search", params.search);
  if (params.campusId) searchParams.append("campusId", params.campusId);
  if (params.page) searchParams.append("page", String(params.page));
  if (params.limit) searchParams.append("limit", String(params.limit));

  const queryString = searchParams.toString();
  const path = `/vendors${queryString ? `?${queryString}` : ""}`;

  const { data, error } = await apiClient.get<BackendPaginatedVendors>(path);

  if (error || !data || !Array.isArray(data.items)) {
    return { data: cachedVendors, total: cachedVendors.length, page: 1, limit: cachedVendors.length, totalPages: 1, error };
  }

  const mapped = data.items.map(mapBackendVendorToFrontend);
  mapped.forEach(upsertCachedVendor);

  return {
    data: mapped,
    total: data.meta.total,
    page: data.meta.page,
    limit: data.meta.limit,
    totalPages: data.meta.totalPages,
    error: null,
  };
}

/**
 * The signed-in user. When nobody is signed in this is an anonymous guest with
 * no id, so nothing can be read or written as someone else.
 */
export function getCurrentUser(): User {
  const authUser = getCurrentAuthUser();
  if (authUser) {
    return {
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      phone: authUser.phone,
      campusId: authUser.campusId,
      role: authUser.role,
      avatar: authUser.avatar,
      bio: "",
      joinedDate: "",
      isVerified: authUser.isVerified,
    };
  }
  return {
    id: "",
    name: "Guest",
    email: "",
    phone: "",
    campusId: "",
    role: "student",
    avatar: "",
    bio: "",
    joinedDate: "",
    isVerified: false,
  };
}

export function getUserById(id: string): User | undefined {
  return _getUserById(id);
}

export function getUsers(): User[] {
  return mockUsers;
}

export function getVendors(): Vendor[] {
  return cachedVendors;
}

export function getVendorById(id: string): Vendor | undefined {
  return cachedVendors.find((v) => v.id === id);
}

export function getVendorBySlug(slug: string): Vendor | undefined {
  return cachedVendors.find((v) => v.slug === slug);
}

export function getVendorByUserId(userId: string): Vendor | undefined {
  return cachedVendors.find((v) => v.userId === userId);
}

export function getTopVendors(): Vendor[] {
  return [...cachedVendors].sort((a, b) => b.rating - a.rating);
}

export function getVendorsByCampus(campusId: string): Vendor[] {
  return cachedVendors.filter((v) => v.campusId === campusId);
}

export function getTopVendorsByCampus(campusId: string): Vendor[] {
  return cachedVendors
    .filter((v) => v.campusId === campusId)
    .sort((a, b) => b.rating - a.rating);
}
