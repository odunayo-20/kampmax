import type { VendorOnboardingStatus } from "@/types/onboarding";
import { VENDOR_ONBOARDING_STATUS } from "@/types/onboarding";

// ============================================================
// VENDOR DASHBOARD DOMAIN TYPES  (Module 10)
// ============================================================
//
// A Vendor Profile belongs to the existing Kampmax User — it is NOT a second
// authentication account. The vendor dashboard serves the authenticated owner.
//
// SECURITY: the frontend never decides approval/status/verification/permission.
// Every status value, metric and permission below is backend-authoritative and
// is only reflected here so the UI renders it. Ownership is always derived
// from the authenticated identity (symbol: {@link #authn}) and never from
// client-supplied vendorId / userId / storeId / staffId.

// ── Access gate ──────────────────────────────────────────────
// Reuses the single source of truth from vendor onboarding.

export type VendorDashboardStatus = VendorOnboardingStatus;

export const VENDOR_DASHBOARD_GATE = {
  APPROVED: "approved",
  PENDING_REVIEW: "pending_review",
  MORE_INFORMATION: "more_information",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  NO_VENDOR: "no_vendor",
} as const;

export type VendorGateKind = ValuesOf<typeof VENDOR_DASHBOARD_GATE>;

type ValuesOf<T> = T[keyof T];

/**
 * Result of evaluating a user's access to the vendor dashboard. The backend
 * MUST enforce authorization; this value only drives presentation.
 */
export interface VendorAccess {
  kind: VendorGateKind;
  status: VendorDashboardStatus | null;
  /** True only when the user may use the full vendor management UI. */
  canUseDashboard: boolean;
  /** Public/admin-approved context, never internal/risk/moderation notes. */
  message: string | null;
  /** The onboarding step to resume when MORE_INFORMATION_REQUIRED. */
  resumeStep: number | null;
  storeName?: string;
  storeSlug?: string;
}

// ── Centralized permission model ─────────────────────────────
// Presentation-only. Backend remains authoritative. Each key's value is a
// plain boolean so the service can reflect NOT-approved states as false.

export const VENDOR_PERMISSION_KEYS = [
  "canManageStore",
  "canManageProducts",
  "canManageOrders",
  "canManageCustomers",
  "canManageReviews",
  "canManagePromotions",
  "canViewAnalytics",
  "canManageStaff",
  "canViewFinancials",
] as const;

export type VendorPermissionKey = (typeof VENDOR_PERMISSION_KEYS)[number];
export type VendorPermissions = Record<VendorPermissionKey, boolean>;

export const VENDOR_PERMISSIONS: VendorPermissions = {
  canManageStore: true,
  canManageProducts: true,
  canManageOrders: true,
  canManageCustomers: true,
  canManageReviews: true,
  canManagePromotions: true,
  canViewAnalytics: true,
  canManageStaff: false,
  canViewFinancials: true,
};

// ── Profile segmentation ─────────────────────────────────────
// Keep User Profile and Vendor Profile separate data models.

export interface VendorProfileSummary {
  userId: string;
  vendorId: string;
  storeName: string;
  storeSlug?: string;
  /** Backend-authoritative onboarding/approval status. */
  status: VendorDashboardStatus;
  verified: boolean;
}

// ── Dashboard metrics (backend-provided; financials only if authorized) ──

export type DashboardMetricTone = "neutral" | "positive" | "negative";

export interface DashboardMetric {
  key: string;
  label: string;
  valueLabel: string;
  sublabel?: string;
  tone: DashboardMetricTone;
}

export interface DashboardOverview {
  summary: string;
  /** Non-financial metric cards shown to the owner (finances gated). */
  metrics: DashboardMetric[];
}

// ── Store operations / health ────────────────────────────────

export interface StoreHealthItem {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
}

export interface StoreHealth {
  /** Backend-authoritative completion score 0–100. */
  score: number;
  items: StoreHealthItem[];
}

// ── Action required (backend-supplied only) ──────────────────

export interface ActionRequiredItem {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  /** e.g. "high" | "medium" | "low" — presentation only. */
  priority: "high" | "medium" | "low";
}

// ── Vendor notifications ─────────────────────────────────────

export interface VendorNotification {
  id: string;
  kind:
    | "new_order"
    | "order_update"
    | "product_issue"
    | "review_received"
    | "store_warning"
    | "verification_update"
    | "platform_announcement"
    | "payout_update";
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

export interface VendorNotifications {
  unreadCount: number;
  items: VendorNotification[];
}

// ── Recent order summary ─────────────────────────────────────

export interface VendorRecentOrder {
  id: string;
  customerName: string;
  createdAt: string;
  amount: number;
  status: OrderStatusLike;
  href: string;
}

type OrderStatusLike =
  | "pending"
  | "paid"
  | "processing"
  | "ready_for_pickup"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "disputed";

export const VENDOR_ORDER_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  PROCESSING: "processing",
  READY_FOR_PICKUP: "ready_for_pickup",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  DISPUTED: "disputed",
} as const;

// ── Store management ─────────────────────────────────────────

/** Store open/visible state. Backend decides if a vendor may change it. */
export const STORE_STATUS = {
  OPEN: "open",
  TEMPORARILY_CLOSED: "temporarily_closed",
  UNAVAILABLE: "unavailable",
} as const;

export type StoreStatus = ValuesOf<typeof STORE_STATUS>;

export type StoreDayMode = "closed" | "open_24" | "custom";

export interface StoreHoursDay {
  dayIndex: number; // 0 = Monday ... 6 = Sunday
  label: string;
  mode: StoreDayMode;
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
}

export interface StoreContact {
  businessEmail: string;
  businessPhone: string;
  messagingAvailable: boolean;
}

export interface StoreLocation {
  primaryCampusId: string;
  supportedCampusIds: string[];
  pickupLocation: string;
  deliveryArea: string;
}

export interface StoreDelivery {
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  /** Estimated preparation time in minutes. */
  prepTimeMinutes: number;
  supportedCampusIds: string[];
  deliveryFee?: number;
}

export interface StorePolicies {
  returnPolicy: string;
  cancellationPolicy: string;
  deliveryPolicy: string;
  pickupPolicy: string;
}

export interface StoreBranding {
  /** Public URL of the uploaded logo, or null when none is set. */
  logoRef?: string | null;
  coverRef?: string | null;
  logoPreviewColor?: string;
}

export interface VendorStore {
  vendorId: string;
  /** Public storefront path segment (/store/<slug>). */
  slug: string;
  identity: {
    storeName: string;
    tagline: string;
    description: string;
    categoryId: string;
  };
  branding: StoreBranding;
  contact: StoreContact;
  location: StoreLocation;
  hours: StoreHoursDay[];
  delivery: StoreDelivery;
  policies: StorePolicies;
  status: StoreStatus;
  /** Platform-level suspension overrides vendor-chosen status. */
  platformSuspended: boolean;
  updatedAt: string;
}
