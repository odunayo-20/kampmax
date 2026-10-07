import type {
  VendorAccess,
  VendorProfileSummary,
  VendorStore,
  VendorNotifications,
  ActionRequiredItem,
  StoreHealth,
  DashboardOverview,
  VendorRecentOrder,
  VendorPermissions,
  StoreStatus,
  StoreHoursDay,
} from "@/types/vendor-dashboard";
import {
  VENDOR_DASHBOARD_GATE,
  VENDOR_PERMISSIONS,
} from "@/types/vendor-dashboard";
import { VENDOR_ONBOARDING_STATUS } from "@/types/onboarding";

import { apiClient, type ApiError } from "@/lib/api-client";
import { uploadFileDirect } from "@/services/media";

// ============================================================
// VENDOR DASHBOARD SERVICE LAYER  (Module 10)
// ============================================================
//
// Maps 1:1 to NestJS backend API:
//   GET /vendors/me              → current user vendor store
//   PATCH /vendors/me            → update current user vendor store
//   GET /vendors/dashboard       → overview metrics
//   GET /vendors/notifications   → notifications
//   GET /vendors/action-required → action items
//   GET /vendors/store/health    → store health
//   POST /vendors/store/branding → logo/cover upload (authenticated)
//
// AUTHORIZATION: ownership is ALWAYS derived from the authenticated identity
// (getCurrentUser().id). We never trust vendorId / storeId / staffId supplied
// by the client. Vendor approval/status/verification are backend-authoritative
// — the gate below only reflects what the backend reports.
//
// SECURITY: never expose bank details, private documents, internal verification
// notes, risk scores, moderation info, or secrets. Raw financials are only
// surfaced when the backend authorizes them (canViewFinancials).

// ── Access gate ──────────────────────────────────────────────
// Reflects backend-authoritative vendor approval status.

/**
 * Last result of GET /vendors/me. Once the layout has resolved the real
 * backend gate, every synchronous consumer (permissions, per-module gates)
 * must agree with it — the mock lookup below only knows mock vendors and would
 * report a real store as NO_VENDOR, disabling the whole management UI.
 */
let liveVendorAccess: VendorAccess | null = null;

export function getVendorAccess(): VendorAccess {
  if (liveVendorAccess) return liveVendorAccess;
  // Until the backend has answered, assume nothing: no management UI.
  return {
    kind: VENDOR_DASHBOARD_GATE.NO_VENDOR,
    status: null,
    canUseDashboard: false,
    message:
      "You don't have a vendor profile yet. Complete vendor onboarding to start selling.",
    resumeStep: null,
  };
}

/** Minimal shape actually returned by GET /vendors/me — see VendorPrivateProfile
 * on the backend (modules/vendors). Deliberately not the full `VendorStore`
 * type, which models a different (mock) nested shape that the real endpoint
 * never returns. */
export interface VendorBackendProfile {
  id: string;
  storeName: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
  verificationStatus: "PENDING" | "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  [key: string]: unknown;
}

/**
 * Determine dashboard access gate state from the live backend.
 *
 * The gate is profile EXISTENCE (+ platform-level status), not KYC
 * verification: a Vendor row (POST /vendors) is ACTIVE and sellable
 * immediately on creation — verificationStatus (PENDING/SUBMITTED/
 * UNDER_REVIEW/VERIFIED/REJECTED/SUSPENDED) is a separate, optional KYC
 * flow surfaced via the profile's /vendor/verification page, not an
 * onboarding or dashboard-access requirement. A 404 on GET /vendors/me
 * means the Vendor capability was never activated (NO_VENDOR); `status:
 * INACTIVE` is the only backend state that actually blocks dashboard use.
 */
export async function getVendorDashboardAccessApi(): Promise<VendorAccess> {
  const access = await fetchVendorDashboardAccess();
  liveVendorAccess = access;
  return access;
}

async function fetchVendorDashboardAccess(): Promise<VendorAccess> {
  const { data, error } = await apiClient.get<VendorBackendProfile>("/vendors/me");

  if (error) {
    if (error.status === 404) {
      return {
        kind: VENDOR_DASHBOARD_GATE.NO_VENDOR,
        status: null,
        canUseDashboard: false,
        message: "You don't have a vendor profile yet. Complete vendor onboarding to start selling.",
        resumeStep: null,
      };
    }
    throw error;
  }
  if (!data) {
    throw new Error("Unable to load vendor profile.");
  }

  if (data.status === "INACTIVE") {
    return {
      kind: VENDOR_DASHBOARD_GATE.SUSPENDED,
      status: VENDOR_ONBOARDING_STATUS.PENDING_REVIEW,
      canUseDashboard: false,
      message: "Your vendor store is currently inactive. Contact support if you believe this is in error.",
      resumeStep: null,
      storeName: data.storeName,
      storeSlug: data.slug,
    };
  }

  return {
    kind: VENDOR_DASHBOARD_GATE.APPROVED,
    status: VENDOR_ONBOARDING_STATUS.APPROVED,
    canUseDashboard: true,
    message: null,
    resumeStep: null,
    storeName: data.storeName,
    storeSlug: data.slug,
  };
}

export interface CreateVendorProfileDto {
  storeName: string;
  campusId: string;
  description?: string;
  phone?: string;
  businessAddress?: string;
}

/**
 * Activate the Vendor capability for the current user.
 * Endpoint: POST /vendors — this IS the onboarding completion step; there is
 * no separate "activation" call. No NIN/BVN/CAC document is required here —
 * that KYC flow lives on the profile at /vendor/verification, entirely
 * decoupled from store creation (see vendors-kyc module on the backend).
 */
export async function createVendorProfileApi(
  dto: CreateVendorProfileDto
): Promise<{ profile: VendorBackendProfile | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<CreateVendorProfileDto, VendorBackendProfile>(
    "/vendors",
    dto
  );
  if (!error && data) return { profile: data, error: null };
  return { profile: null, error };
}

// ── Permissions (presentation only) ──────────────────────────

export function getVendorPermissions(): VendorPermissions {
  const access = getVendorAccess();
  if (access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) {
    // Non-approved vendors don't get management UI.
    return {
      ...VENDOR_PERMISSIONS,
      canManageStore: false,
      canManageProducts: false,
      canManageOrders: false,
      canManageCustomers: false,
      canManageReviews: false,
      canViewAnalytics: false,
    };
  }
  return { ...VENDOR_PERMISSIONS };
}

// ── Store management (live: GET/PATCH /vendors/me/store) ─────

/** What the store page edits; the backend validates every section. */
export interface StorePatch {
  identity?: Partial<VendorStore["identity"]>;
  branding?: {
    /** Uploaded media id; null removes the image. */
    logoMediaId?: string | null;
    coverMediaId?: string | null;
    logoPreviewColor?: string;
  };
  contact?: Partial<VendorStore["contact"]>;
  location?: Partial<VendorStore["location"]>;
  hours?: Array<Pick<StoreHoursDay, "dayIndex" | "mode" | "openTime" | "closeTime">>;
  delivery?: Partial<VendorStore["delivery"]>;
  policies?: Partial<VendorStore["policies"]>;
  status?: Exclude<StoreStatus, "unavailable">;
}

export interface StoreResult {
  store: VendorStore | null;
  error: ApiError | null;
}

/** The signed-in vendor's real store. Never falls back to demo data. */
export async function fetchMyStoreApi(): Promise<StoreResult> {
  const { data, error } = await apiClient.get<VendorStore>("/vendors/me/store");
  if (error || !data?.vendorId) return { store: null, error };
  return { store: data, error: null };
}

/** Saves part of the store; the response is the saved state. */
export async function updateStoreApi(patch: StorePatch): Promise<StoreResult> {
  const { data, error } = await apiClient.patch<StorePatch, VendorStore>(
    "/vendors/me/store",
    patch
  );
  if (error || !data?.vendorId) return { store: null, error };
  return { store: data, error: null };
}

/**
 * Uploads a logo or cover image and attaches it to the store. The backend
 * checks the file type and size and that the upload is the caller's own.
 */
export async function uploadStoreImageApi(
  field: "logo" | "cover",
  file: File
): Promise<StoreResult> {
  const { data: media, error } = await uploadFileDirect(
    file,
    field === "logo" ? "logo" : "banner"
  );
  if (error || !media) return { store: null, error };
  return updateStoreApi({
    branding: field === "logo" ? { logoMediaId: media.id } : { coverMediaId: media.id },
  });
}

export function removeStoreImageApi(field: "logo" | "cover"): Promise<StoreResult> {
  return updateStoreApi({
    branding: field === "logo" ? { logoMediaId: null } : { coverMediaId: null },
  });
}
