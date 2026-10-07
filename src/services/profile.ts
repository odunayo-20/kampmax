import { User } from "@/types";
import { apiClient, ApiError } from "@/lib/api-client";

// ============================================================
// BACKEND RESPONSE & DTO TYPES (from NestJS Users & Notifications Module)
// ============================================================

export interface PrivateUserProfile {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  department: string | null;
  faculty: string | null;
  level: string | null;
  matricNumber: string | null;
  status: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserProfile {
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  department: string | null;
  faculty: string | null;
  level: string | null;
  createdAt: string;
}

// Note: the backend's UpdateProfileDto has no `phone`/`email`/`campusId`
// fields — phone/email changes require separate verification flows, and
// campus is a CampusMembership relation, not a User column. Sending them
// here would 400 (the global ValidationPipe uses forbidNonWhitelisted).
export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  gender?: string;
  department?: string;
  faculty?: string;
  level?: string;
  matricNumber?: string;
}

/**
 * Maps backend profile to frontend User model.
 */
export function mapBackendProfileToFrontend(raw: PrivateUserProfile): User {
  return {
    id: raw.id,
    name: [raw.firstName, raw.lastName].filter(Boolean).join(" ") || raw.username,
    email: raw.email,
    phone: raw.phone ?? "",
    avatar: raw.avatar ?? "",
    campusId: "",
    department: raw.department ?? undefined,
    level: raw.level ?? undefined,
    role: "student",
    joinedDate: typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    bio: raw.bio ?? "",
    isVerified: Boolean(raw.emailVerifiedAt),
  };
}

// ============================================================
// ASYNC API METHODS (Users & Preferences)
// ============================================================

/**
 * Fetch authenticated user profile.
 * GET /api/v1/users/me
 */
export async function fetchMyProfile(): Promise<{ data: PrivateUserProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<PrivateUserProfile>("/users/me");
  if (error || !data || !data.id) {
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Update authenticated user profile.
 * PATCH /api/v1/users/me
 */
export async function updateMyProfile(
  payload: UpdateProfilePayload
): Promise<{ data: PrivateUserProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<UpdateProfilePayload, PrivateUserProfile>(
    "/users/me",
    payload
  );
  if (error || !data || !data.id) {
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Update authenticated user avatar.
 * PATCH /api/v1/users/me/avatar
 */
export async function updateAvatarApi(
  avatarUrl: string
): Promise<{ data: PrivateUserProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<{ avatar: string }, PrivateUserProfile>(
    "/users/me/avatar",
    { avatar: avatarUrl }
  );
  if (error || !data || !data.id) {
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Fetch public profile by username.
 * GET /api/v1/users/:username
 */
export async function fetchPublicProfile(
  username: string
): Promise<{ data: PublicUserProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<PublicUserProfile>(`/users/${encodeURIComponent(username)}`);
  if (error || !data || !data.username) {
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Delete current user account.
 * DELETE /api/v1/users/me
 */
export async function deleteAccountApi(): Promise<{ success: boolean; error: ApiError | null }> {
  const { error } = await apiClient.delete("/users/me");
  return { success: !error, error };
}
