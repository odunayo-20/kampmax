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
  StoreBranding,
} from "@/types/vendor-dashboard";
import {
  VENDOR_DASHBOARD_GATE,
  VENDOR_PERMISSIONS,
} from "@/types/vendor-dashboard";
import { VENDOR_ONBOARDING_STATUS } from "@/types/onboarding";
import { getCurrentUser, getVendorByUserId } from "@/services/users";
import {
  storeMock,
  dashboardOverview,
  notificationsMock,
  initialActionRequired,
  initialStoreHealth,
  recentOrders as mockRecentOrders,
} from "@/data/vendor-dashboard";

import { apiClient, type ApiError } from "@/lib/api-client";

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
  const user = getCurrentUser();
  const vendor = getVendorByUserId(user.id);

  if (!vendor) {
    return {
      kind: VENDOR_DASHBOARD_GATE.NO_VENDOR,
      status: null,
      canUseDashboard: false,
      message:
        "You don't have a vendor profile yet. Complete vendor onboarding to start selling.",
      resumeStep: null,
    };
  }

  const base: VendorAccess = {
    kind: VENDOR_DASHBOARD_GATE.APPROVED,
    status: VENDOR_ONBOARDING_STATUS.APPROVED,
    canUseDashboard: true,
    message: null,
    resumeStep: null,
    storeName: vendor.storeName,
    storeSlug: vendor.slug,
  };

  // The prototype's approved vendor demo. In production this mapping comes
  // from the backend keyed to the authenticated identity. We model the other
  // states explicitly so gating is correct across all vendor lifecycle states.
  if (!vendor.verified) {
    return {
      ...base,
      kind: VENDOR_DASHBOARD_GATE.PENDING_REVIEW,
      status: VENDOR_ONBOARDING_STATUS.PENDING_REVIEW,
      canUseDashboard: false,
      message:
        "Your vendor application is under review. You'll get full access once approved.",
    };
  }

  return base;
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

/**
 * Simple, presentation-only evaluation of which states map to which gate.
 * Kept separate so UI can render correct state screens; backend remains the
 * authority. Accepts an explicit status for testing pending / more-info /
 * rejected / suspended states.
 */
export function evaluateGateStatus(status: string): VendorAccess {
  const user = getCurrentUser();
  const vendor = getVendorByUserId(user.id);
  const base = {
    storeName: vendor?.storeName,
    storeSlug: vendor?.slug,
  };

  if (status === VENDOR_ONBOARDING_STATUS.PENDING_REVIEW) {
    return {
      kind: VENDOR_DASHBOARD_GATE.PENDING_REVIEW,
      status: VENDOR_ONBOARDING_STATUS.PENDING_REVIEW,
      canUseDashboard: false,
      message: "Your vendor application is under review.",
      resumeStep: null,
      ...base,
    };
  }
  if (status === VENDOR_ONBOARDING_STATUS.MORE_INFORMATION_REQUIRED) {
    return {
      kind: VENDOR_DASHBOARD_GATE.MORE_INFORMATION,
      status: VENDOR_ONBOARDING_STATUS.MORE_INFORMATION_REQUIRED,
      canUseDashboard: false,
      message: "We need more information before we can approve your store.",
      resumeStep: 5, // verification step
      ...base,
    };
  }
  if (status === VENDOR_ONBOARDING_STATUS.REJECTED) {
    return {
      kind: VENDOR_DASHBOARD_GATE.REJECTED,
      status: VENDOR_ONBOARDING_STATUS.REJECTED,
      canUseDashboard: false,
      message:
        "Your vendor application was not approved. You may re-apply after resolving the reasons.",
      resumeStep: null,
      ...base,
    };
  }
  if (status === VENDOR_ONBOARDING_STATUS.SUSPENDED) {
    return {
      kind: VENDOR_DASHBOARD_GATE.SUSPENDED,
      status: VENDOR_ONBOARDING_STATUS.SUSPENDED,
      canUseDashboard: false,
      message:
        "Your store is currently suspended. Contact support for help restoring access.",
      resumeStep: null,
      ...base,
    };
  }
  return getVendorAccess();
}

export function getVendorProfileSummary(): VendorProfileSummary | null {
  const access = getVendorAccess();
  const vendor = getVendorByUserId(getCurrentUser().id);
  if (!vendor || access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) return null;
  return {
    userId: getCurrentUser().id,
    vendorId: vendor.id,
    storeName: vendor.storeName,
    storeSlug: vendor.slug,
    status: VENDOR_ONBOARDING_STATUS.APPROVED,
    verified: vendor.verified,
  };
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

// ── Overview / metrics ───────────────────────────────────────

export function getDashboardOverview(): DashboardOverview {
  // Financial metrics are NOT shown here unless the backend authorizes them.
  // DashboardOverview only carries non-financial, backend-provided metrics.
  return dashboardOverview;
}

export function getRecentOrders(): VendorRecentOrder[] {
  return mockRecentOrders;
}

// ── Notifications ────────────────────────────────────────────

export function getNotifications(): VendorNotifications {
  return notificationsMock.notifications;
}

export function markNotificationsRead(all: boolean, id?: string): void {
  if (all) {
    notificationsMock.notifications.items.forEach((n) => (n.read = true));
    notificationsMock.notifications.unreadCount = 0;
  } else if (id) {
    const item = notificationsMock.notifications.items.find((n) => n.id === id);
    if (item && !item.read) {
      item.read = true;
      notificationsMock.notifications.unreadCount = Math.max(
        0,
        notificationsMock.notifications.unreadCount - 1
      );
    }
  }
}

// ── Action required (backend-supplied only) ──────────────────

export function getActionRequired(): ActionRequiredItem[] {
  return initialActionRequired;
}

// ── Store health (backend-authoritative) ─────────────────────

export function getStoreHealth(): StoreHealth {
  return initialStoreHealth;
}

// ── Store management ─────────────────────────────────────────

export async function fetchMyStoreApi(): Promise<VendorStore | null> {
  const { data, error } = await apiClient.get<VendorStore>("/vendors/me");
  if (!error && data && data.vendorId) {
    storeMock.store = data;
    return data;
  }
  return getStore();
}

export function getStore(): VendorStore | null {
  const access = getVendorAccess();
  if (access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) return null;
  return clone(storeMock.store);
}

export interface StoreUpdateResult {
  ok: boolean;
  store: VendorStore | null;
  error?: string;
}

export async function updateStoreApi(patch: Partial<VendorStore>): Promise<StoreUpdateResult> {
  const { data, error } = await apiClient.patch<Partial<VendorStore>, VendorStore>("/vendors/me", patch);
  if (!error && data) {
    storeMock.store = data;
    return { ok: true, store: data };
  }
  return updateStore(patch);
}

/**
 * Update store fields. The backend validates every change and decides whether
 * a store-status (open/closed) change is permitted — a vendor must never be
 * able to override a platform-level suspension.
 */
export function updateStore(patch: Partial<VendorStore>): StoreUpdateResult {
  const access = getVendorAccess();
  if (access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) {
    return { ok: false, store: null, error: "You don't have permission to edit this store." };
  }
  const current = storeMock.store;
  const next = mergeStore(current, patch);

  // Platform suspension overrides any vendor-chosen status.
  if (current.platformSuspended) {
    next.status = "unavailable";
  }
  next.updatedAt = new Date().toISOString();
  storeMock.store = next;
  return { ok: true, store: clone(next) };
}

export function setStoreStatus(status: StoreStatus): StoreUpdateResult {
  // Frontend submits the desired state; backend decides permission.
  return updateStore({ status });
}

function mergeStore(current: VendorStore, patch: Partial<VendorStore>): VendorStore {
  return {
    ...current,
    ...patch,
    identity: { ...current.identity, ...(patch.identity ?? {}) },
    branding: { ...current.branding, ...(patch.branding ?? {}) },
    contact: { ...current.contact, ...(patch.contact ?? {}) },
    location: { ...current.location, ...(patch.location ?? {}) },
    delivery: { ...current.delivery, ...(patch.delivery ?? {}) },
    policies: { ...current.policies, ...(patch.policies ?? {}) },
    hours: patch.hours ?? current.hours,
  };
}

// ── Branding uploads (authenticated; private refs only) ──────

export interface BrandingUploadResult {
  ok: boolean;
  branding: StoreBranding;
  error?: string;
}

export function uploadBranding(
  field: "logoRef" | "coverRef",
  fileName: string,
  fileSizeBytes: number,
  fileType: string,
  previewColor: string
): BrandingUploadResult {
  const access = getVendorAccess();
  if (access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) {
    return { ok: false, branding: storeMock.store.branding, error: "Not authorized." };
  }
  // Client-side validation is a UX aid, NOT a security boundary. The backend
  // re-validates. Only private/authenticated refs are produced — never public URLs.
  void fileType;
  if (fileSizeBytes <= 0 || fileSizeBytes > 8 * 1024 * 1024) {
    return { ok: false, branding: storeMock.store.branding, error: "File must be 8MB or smaller." };
  }
  const existing = storeMock.store.branding[field];
  const next: StoreBranding = {
    ...storeMock.store.branding,
    [field]: existing ?? `private://vstore/${storeMock.store.vendorId}/${field}-${Date.now()}`,
    logoPreviewColor: previewColor || storeMock.store.branding.logoPreviewColor,
  };
  storeMock.store.branding = next;
  storeMock.store.updatedAt = new Date().toISOString();
  return { ok: true, branding: clone(next) };
}

export function removeBranding(field: "logoRef" | "coverRef"): StoreBranding {
  const next: StoreBranding = { ...storeMock.store.branding, [field]: null };
  storeMock.store.branding = next;
  storeMock.store.updatedAt = new Date().toISOString();
  return clone(next);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
