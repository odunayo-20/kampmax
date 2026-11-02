// ============================================================
// FREELANCER SERVICES & PORTFOLIO TYPES  (Module 23B)
// ============================================================
//
// Backend-authoritative projections for the freelancer "My Services"
// and "Portfolio" management areas. The frontend only collects editable
// user input; the backend owns status, review, visibility, verification
// and publication. Service status in particular is NEVER set by the
// client — actions such as "Publish"/"Archive" are sent to the backend
// which resolves the resulting state.
//
// Portfolio reuses the `FreelancerPortfolioItem` shape already defined in
// `@/types/freelancer` (shared with the onboarding profile preview) so there
// is a single source of truth rather than a second, divergent portfolio model.

// ── Service status (backend-owned lifecycle) ─────────────────

export const FREELANCER_SERVICE_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  PUBLISHED: "published",
  PAUSED: "paused",
  REJECTED: "rejected",
  ARCHIVED: "archived",
} as const;

export type FreelancerServiceStatus =
  (typeof FREELANCER_SERVICE_STATUS)[keyof typeof FREELANCER_SERVICE_STATUS];

// ── Pricing model (backend enum) ────────────────────────────

export const FREELANCER_SERVICE_PRICING = {
  FIXED: "fixed",
  STARTING_AT: "starting_at",
  HOURLY: "hourly",
  PROJECT: "project",
} as const;

export type FreelancerServicePricing =
  (typeof FREELANCER_SERVICE_PRICING)[keyof typeof FREELANCER_SERVICE_PRICING];

// ── Delivery estimate unit (backend enum) ───────────────────

export const FREELANCER_SERVICE_DELIVERY_UNIT = {
  HOURS: "hours",
  DAYS: "days",
  WEEKS: "weeks",
} as const;

export type FreelancerServiceDeliveryUnit =
  (typeof FREELANCER_SERVICE_DELIVERY_UNIT)[keyof typeof FREELANCER_SERVICE_DELIVERY_UNIT];

// ── Service visibility (backend authoritative) ──────────────

export const FREELANCER_SERVICE_VISIBILITY = {
  VISIBLE: "visible",
  HIDDEN: "hidden",
} as const;

export type FreelancerServiceVisibility =
  (typeof FREELANCER_SERVICE_VISIBILITY)[keyof typeof FREELANCER_SERVICE_VISIBILITY];

// ── Service model ───────────────────────────────────────────
// A freelancer-owned sellable service. Only editable business fields are
// writable by the client; status/visibility/views are backend-owned.

export interface FreelancerService {
  id: string;
  /** Public-page address segment: /freelancers/services/[slug]. */
  slug?: string;
  userId: string;
  /** Who offers it; present on public listings only. */
  freelancer?: { id: string; name: string; avatar?: string };
  title: string;
  categoryId: string;
  /** Category name as the server returns it, so public pages need no taxonomy lookup. */
  categoryName?: string;
  skills: string[];
  shortDescription: string;
  description: string;
  pricing: FreelancerServicePricing;
  price?: number; // pricing base (fixed / starting / hourly / project)
  priceMax?: number; // optional upper bound for "starting_at"
  deliveryValue?: number;
  deliveryUnit: FreelancerServiceDeliveryUnit;
  revisions?: number;
  deliverables: string[];
  coverImageUrl?: string;
  status: FreelancerServiceStatus;
  visibility: FreelancerServiceVisibility;
  createdAt: string;
  updatedAt: string;
  // Backend-provided statistics (only shown if the backend returns them).
  viewCount?: number;
  orderCount?: number;
}

// ── Editable service input (explicit whitelist — mass-assignment safe) ──
// The service layer builds a FreelancerService from exactly these fields and
// never copies ownerId/status/visibility/createdAt/updatedAt from the client.

export interface FreelancerServiceInput {
  title: string;
  categoryId: string;
  skills: string[];
  shortDescription: string;
  description: string;
  pricing: FreelancerServicePricing;
  price?: number;
  priceMax?: number;
  deliveryValue?: number;
  deliveryUnit: FreelancerServiceDeliveryUnit;
  revisions?: number;
  deliverables: string[];
  coverImageUrl?: string;
}

// ── Mutation results ─────────────────────────────────────────

export const FREELANCER_SERVICE_RESULT = {
  OK: "ok",
  NOT_FOUND: "not_found",
  UNAUTHORIZED: "unauthorized",
  VALIDATION: "validation",
  CONFLICT: "conflict",
} as const;

export type FreelancerServiceResultCode =
  (typeof FREELANCER_SERVICE_RESULT)[keyof typeof FREELANCER_SERVICE_RESULT];

export interface FreelancerServiceResult {
  ok: boolean;
  code: FreelancerServiceResultCode;
  message: string;
  service?: FreelancerService;
  // For status transitions, the resolved status after the backend action.
  status?: FreelancerServiceStatus;
}

export interface FreelancerServicePage {
  items: FreelancerService[];
  total: number;
}

// ── Filter query (URL-synced server-side style filtering) ───

export interface FreelancerServiceQuery {
  status?: FreelancerServiceStatus | "all";
  search?: string;
}
