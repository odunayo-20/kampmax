import { getCurrentUser } from "@/services/users";
import { apiClient } from "@/lib/api-client";
import type { ServiceProviderOnboardingStatus } from "@/types/service-provider";

// ============================================================
// SERVICE PROVIDER DASHBOARD  (live)
// ============================================================
//
// The provider's dashboard reads and writes the real backend. Ownership is
// always taken from the signed-in identity, and approval, verification and
// moderation are decided by Kampmax: this layer only reports what the
// backend says. Nothing here is kept in the browser.

// ── Access gate ──────────────────────────────────────────────

export const SERVICE_PROVIDER_DASHBOARD_GATE = {
  APPROVED: "approved",
  PENDING_REVIEW: "pending_review",
  MORE_INFORMATION: "more_information",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  NO_PROVIDER: "no_provider",
} as const;

export type ServiceProviderDashboardGateKind =
  (typeof SERVICE_PROVIDER_DASHBOARD_GATE)[keyof typeof SERVICE_PROVIDER_DASHBOARD_GATE];

export interface ServiceProviderAccess {
  kind: ServiceProviderDashboardGateKind;
  status: ServiceProviderOnboardingStatus | null;
  canUseDashboard: boolean;
  message: string | null;
  displayName?: string;
  slug?: string;
  /** The provider's real verification state, for the badge. */
  verification?: "not_required" | "pending" | "approved" | "action_required";
}

interface ServiceProviderBackendProfile {
  id: string;
  displayName: string;
  slug: string;
  isActive: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "SUSPENDED" | "DEACTIVATED";
  [key: string]: unknown;
}

/**
 * Determine dashboard access gate state from the live backend.
 *
 * Gate is profile EXISTENCE (+ isActive), not verificationStatus — nothing
 * on the backend blocks a PENDING (unverified) service provider from using
 * their dashboard; identity/business verification is a separate, optional
 * flow surfaced from the profile (/service-provider/verification), not an
 * onboarding or dashboard-access requirement. A 404 on GET
 * /service-provider/profile/me means the capability was never activated.
 */
export async function getServiceProviderDashboardAccessApi(): Promise<ServiceProviderAccess> {
  const { data, error } = await apiClient.get<ServiceProviderBackendProfile>(
    "/service-provider/profile/me"
  );

  if (error) {
    if (error.status === 404) {
      return {
        kind: SERVICE_PROVIDER_DASHBOARD_GATE.NO_PROVIDER,
        status: null,
        canUseDashboard: false,
        message: "You don't have a service provider profile yet.",
        displayName: getCurrentUser().name,
      };
    }
    throw error;
  }
  if (!data) {
    throw new Error("Unable to load service provider profile.");
  }

  if (!data.isActive || data.verificationStatus === "SUSPENDED" || data.verificationStatus === "DEACTIVATED") {
    return {
      kind: SERVICE_PROVIDER_DASHBOARD_GATE.SUSPENDED,
      status: "SUSPENDED",
      canUseDashboard: false,
      message: "Your service provider profile is currently unavailable.",
      displayName: data.displayName,
      slug: data.slug,
    };
  }

  return {
    kind: SERVICE_PROVIDER_DASHBOARD_GATE.APPROVED,
    status: "APPROVED",
    canUseDashboard: true,
    message: null,
    displayName: data.displayName,
    slug: data.slug,
    verification: data.verificationStatus === "VERIFIED" ? "approved" : "pending",
  };
}

// ── Live Backend API exports ─────────────────────────────────
export {
  fetchSpDashboardLive,
  fetchSpProfileRecordLive,
  updateSpProfileLive,
  fetchSpServicesLive,
  addSpDashboardServiceLive,
  updateSpDashboardServiceLive,
  setSpDashboardServiceStatusLive,
  fetchSpAvailabilityLive,
  updateSpAvailabilityLive,
  fetchSpReviewsSummaryLive,
  buildDashboardRecordFromLive,
  computeProfileCompletionFromLive,
} from "./service-provider-dashboard.api";