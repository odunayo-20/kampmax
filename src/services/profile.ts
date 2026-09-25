import {
  SavedAddress,
  SavedPaymentMethod,
  NotificationPreferences,
  PrivacySettings,
  SecuritySettings,
  LoyaltyProgram,
  User,
} from "@/types";
import {
  savedPaymentMethods as mockPaymentMethods,
  defaultNotificationPreferences,
  defaultPrivacySettings,
  defaultSecuritySettings,
  loyaltyProgram,
} from "@/data/profile";
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

export interface BackendNotificationPreferencesResponse {
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  typeSettings: Record<string, { inApp?: boolean; email?: boolean; push?: boolean }> | null;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesPayload {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  typeSettings?: Record<string, { inApp?: boolean; email?: boolean; push?: boolean }>;
}

let paymentMethods = [...mockPaymentMethods];
let notifPrefs = { ...defaultNotificationPreferences };
let privSettings = { ...defaultPrivacySettings };
let secSettings = { ...defaultSecuritySettings };

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

/**
 * Fetch notification preferences.
 * GET /api/v1/notification-preferences
 */
export async function fetchNotificationPreferences(): Promise<{
  data: NotificationPreferences | null;
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<BackendNotificationPreferencesResponse>(
    "/notification-preferences"
  );
  if (error || !data) {
    return { data: notifPrefs, error };
  }

  const mapped: NotificationPreferences = {
    orderUpdates: data.inAppEnabled,
    messages: data.pushEnabled,
    promotions: data.emailEnabled,
    community: false,
    system: data.inAppEnabled,
    emailDigest: data.emailEnabled,
    pushEnabled: data.pushEnabled,
  };
  notifPrefs = mapped;
  return { data: mapped, error: null };
}

/**
 * Update notification preferences on backend.
 * PATCH /api/v1/notification-preferences
 */
export async function updateNotificationPreferencesApi(
  data: Partial<NotificationPreferences>
): Promise<{ data: NotificationPreferences; error: ApiError | null }> {
  notifPrefs = { ...notifPrefs, ...data };

  const payload: UpdateNotificationPreferencesPayload = {
    inAppEnabled: data.orderUpdates ?? data.system,
    emailEnabled: data.promotions ?? data.emailDigest,
    pushEnabled: data.pushEnabled ?? data.messages,
  };

  const { error } = await apiClient.patch<
    UpdateNotificationPreferencesPayload,
    BackendNotificationPreferencesResponse
  >("/notification-preferences", payload);

  return { data: notifPrefs, error };
}

// ============================================================
// LOCAL / ADDRESS / PAYMENT METHODS (Synchronous + Fallback)
// ============================================================

export function getSavedPaymentMethods(): SavedPaymentMethod[] {
  return paymentMethods;
}

export function addPaymentMethod(
  method: Omit<SavedPaymentMethod, "id" | "createdAt">
): SavedPaymentMethod {
  const newMethod = {
    ...method,
    id: `pm${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  paymentMethods = [...paymentMethods, newMethod];
  return newMethod;
}

export function deletePaymentMethod(id: string): void {
  paymentMethods = paymentMethods.filter((m) => m.id !== id);
}

export function setDefaultPaymentMethod(id: string): void {
  paymentMethods = paymentMethods.map((m) => ({
    ...m,
    isDefault: m.id === id,
  }));
}

export function getNotificationPreferences(): NotificationPreferences {
  return notifPrefs;
}

export function updateNotificationPreferences(
  data: Partial<NotificationPreferences>
): NotificationPreferences {
  notifPrefs = { ...notifPrefs, ...data };
  return notifPrefs;
}

export function getPrivacySettings(): PrivacySettings {
  return privSettings;
}

export function updatePrivacySettings(
  data: Partial<PrivacySettings>
): PrivacySettings {
  privSettings = { ...privSettings, ...data };
  return privSettings;
}

export function getSecuritySettings(): SecuritySettings {
  return secSettings;
}

export function updateSecuritySettings(
  data: Partial<SecuritySettings>
): SecuritySettings {
  secSettings = { ...secSettings, ...data };
  return secSettings;
}

export function getLoyaltyProgram(): LoyaltyProgram {
  return loyaltyProgram;
}
