import { apiClient } from "@/lib/api-client";
import { accommodationApi } from "@/services/accommodation";
import type { AccommodationAgentProfile, AccommodationAgentStatus } from "@/types/accommodation";

// ============================================================
// AGENT DASHBOARD SERVICE LAYER
// ============================================================
//
// Follows the same architecture as vendor-dashboard.ts and
// service-provider-dashboard.ts.
//
// Maps to NestJS backend accommodation endpoints:
//   GET /accommodation/agents/status  → check whether applied & current status
//   GET /accommodation/agents/me      → agent profile & documents
//   PATCH /accommodation/agents/me    → update agent profile
//
// AUTHORIZATION: ownership is derived from the authenticated identity.
// Approval, status, and verification are backend-authoritative.

export const AGENT_DASHBOARD_GATE = {
  APPROVED: "approved",
  PENDING_REVIEW: "pending_review",
  MORE_INFORMATION: "more_information",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  NO_AGENT: "no_agent",
} as const;

export type AgentDashboardGateKind =
  (typeof AGENT_DASHBOARD_GATE)[keyof typeof AGENT_DASHBOARD_GATE];

export interface AgentAccess {
  kind: AgentDashboardGateKind;
  status: AccommodationAgentStatus | null;
  canUseDashboard: boolean;
  message: string | null;
  displayName?: string;
  agencyName?: string | null;
  operatingLocation?: string;
  phone?: string;
  email?: string;
}

let liveAgentAccess: AgentAccess | null = null;

export function getCachedAgentAccess(): AgentAccess {
  if (liveAgentAccess) return liveAgentAccess;
  return {
    kind: AGENT_DASHBOARD_GATE.NO_AGENT,
    status: null,
    canUseDashboard: false,
    message: "You don't have an accommodation agent profile yet. Complete agent onboarding to start listing properties.",
  };
}

/**
 * Determine dashboard access gate state from the live backend.
 * Reads GET /accommodation/agents/status and GET /accommodation/agents/me.
 * Used by AgentLayout and the shared cross-vertical ProfileSwitcher.
 */
export async function getAgentDashboardAccessApi(): Promise<AgentAccess> {
  const access = await fetchAgentDashboardAccess();
  liveAgentAccess = access;
  return access;
}

async function fetchAgentDashboardAccess(): Promise<AgentAccess> {
  try {
    const statusData = await accommodationApi.agentStatus();

    if (!statusData.applied) {
      return {
        kind: AGENT_DASHBOARD_GATE.NO_AGENT,
        status: null,
        canUseDashboard: false,
        message: "You don't have an accommodation agent profile yet. Complete agent onboarding to start listing properties.",
      };
    }

    // Agent has applied; fetch profile record for display details
    try {
      const profile = await accommodationApi.agentProfile();
      const displayName = profile.agencyName || profile.fullName || "Accommodation Agent";

      if (profile.status === "APPROVED") {
        return {
          kind: AGENT_DASHBOARD_GATE.APPROVED,
          status: "APPROVED",
          canUseDashboard: true,
          message: null,
          displayName,
          agencyName: profile.agencyName,
          operatingLocation: profile.operatingLocation,
          phone: profile.phone,
          email: profile.email,
        };
      }

      if (profile.status === "SUSPENDED" || profile.status === "REVOKED") {
        return {
          kind: AGENT_DASHBOARD_GATE.SUSPENDED,
          status: profile.status,
          canUseDashboard: false,
          message: profile.suspensionReason || "Your agent privileges have been suspended. Please contact support.",
          displayName,
        };
      }

      if (profile.status === "REJECTED") {
        return {
          kind: AGENT_DASHBOARD_GATE.REJECTED,
          status: "REJECTED",
          canUseDashboard: false,
          message: profile.rejectionReason || "Your agent application was not approved.",
          displayName,
        };
      }

      if (profile.infoRequest) {
        return {
          kind: AGENT_DASHBOARD_GATE.MORE_INFORMATION,
          status: "PENDING",
          canUseDashboard: true,
          message: `Administrator requested information: "${profile.infoRequest}"`,
          displayName,
          agencyName: profile.agencyName,
          operatingLocation: profile.operatingLocation,
          phone: profile.phone,
          email: profile.email,
        };
      }

      return {
        kind: AGENT_DASHBOARD_GATE.PENDING_REVIEW,
        status: "PENDING",
        canUseDashboard: true, // Pending agents can prepare their properties and draft listings
        message: "Your agent application is under review. You can set up your properties now.",
        displayName,
        agencyName: profile.agencyName,
        operatingLocation: profile.operatingLocation,
        phone: profile.phone,
        email: profile.email,
      };
    } catch {
      return {
        kind: statusData.status === "APPROVED" ? AGENT_DASHBOARD_GATE.APPROVED : AGENT_DASHBOARD_GATE.PENDING_REVIEW,
        status: statusData.status,
        canUseDashboard: true,
        message: null,
        displayName: "Accommodation Agent",
      };
    }
  } catch (error) {
    return {
      kind: AGENT_DASHBOARD_GATE.NO_AGENT,
      status: null,
      canUseDashboard: false,
      message: "Could not load accommodation agent profile.",
    };
  }
}

/** Check if pathname is within the agent dashboard */
export function isAgentDashboardPath(pathname: string): boolean {
  return pathname === "/agent" || pathname.startsWith("/agent/");
}

