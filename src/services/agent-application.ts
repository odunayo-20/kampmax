// ============================================================
// AGENT APPLICATION — where an accommodation agent's application stands
// ============================================================
//
// One wording for the agent workspace, the onboarding "submitted" page and
// any notice, matching the mobile app (kampmax-mobile lib/agent-onboarding +
// lib/agent-hub). The backend decides the status; this only words it.
//
// Until Kampmax approves an agent, the backend refuses properties, listings,
// subscriptions and enquiries (AgentsService.requireApproved), so those pages
// show where the application stands instead of screens that would fail.

import { AGENT_DASHBOARD_GATE, type AgentDashboardGateKind } from "@/services/agent-dashboard";
import type { AccommodationAgentStatus } from "@/types/accommodation";

export type StatusTone = "info" | "attention" | "bad" | "positive";

export interface AgentStatusView {
  tone: StatusTone;
  title: string;
  text: string;
  /** Whether adding or replacing documents still helps. */
  canAddDocuments: boolean;
}

export function agentStatusView(
  status: AccommodationAgentStatus | null | undefined,
  extras: { infoRequest?: string | null; rejectionReason?: string | null; suspensionReason?: string | null } = {}
): AgentStatusView {
  switch (status) {
    case "APPROVED":
      return {
        tone: "positive",
        title: "You are a verified agent",
        text: "Your application was approved. Your trust badge shows on your listings.",
        canAddDocuments: true,
      };
    case "REJECTED":
      return {
        tone: "bad",
        title: "Application not approved",
        text: extras.rejectionReason?.trim() || "Your application was not approved. Contact support if you think this is a mistake.",
        canAddDocuments: false,
      };
    case "SUSPENDED":
      return {
        tone: "bad",
        title: "Your agent profile is suspended",
        text: extras.suspensionReason?.trim() || "Contact support to find out why and what to do next.",
        canAddDocuments: false,
      };
    case "REVOKED":
      return {
        tone: "bad",
        title: "Your agent profile was removed",
        text: extras.suspensionReason?.trim() || "This agent profile can no longer be used. Contact support.",
        canAddDocuments: false,
      };
    default:
      if (extras.infoRequest?.trim()) {
        return { tone: "attention", title: "Kampmax needs a little more", text: extras.infoRequest.trim(), canAddDocuments: true };
      }
      return {
        tone: "info",
        title: "Application under review",
        text: "Our trust and safety team reviews applications within 24 to 48 hours. You will get a notification when there is news.",
        canAddDocuments: true,
      };
  }
}

export type StepState = "done" | "current" | "action" | "stopped" | "todo";

export interface ApplicationStep {
  title: string;
  text: string;
  state: StepState;
}

const NEXT_STEPS = [
  { title: "We check your documents", text: "Usually within 24 to 48 hours." },
  { title: "Prepare your properties", text: "Photos, rooms and rent amounts, ready to list." },
  { title: "Publish and get enquiries", text: "Choose a listing package and reach students on campus." },
];

/**
 * Where an application stands as a short timeline: sent, checked by Kampmax, then the two things the agent can do
 * once approved. The check carries the status: waiting, needs the agent, stopped, or done.
 */
export function applicationSteps(tone: StatusTone): ApplicationStep[] {
  const check: StepState =
    tone === "bad" ? "stopped" : tone === "attention" ? "action" : tone === "positive" ? "done" : "current";
  return [
    { title: "Application sent", text: "We have your details and documents.", state: "done" },
    ...NEXT_STEPS.map((s, i): ApplicationStep => ({
      ...s,
      state: i === 0 ? check : i === 1 && tone === "positive" ? "current" : "todo",
    })),
  ];
}

/** Workspace pages that only work once an agent is approved. */
export const AFTER_APPROVAL_PATHS = ["/agent/properties", "/agent/listings", "/agent/enquiries", "/agent/visits", "/agent/billing"];

export function opensAfterApproval(pathname: string): boolean {
  return AFTER_APPROVAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const WAITING: AgentDashboardGateKind[] = [AGENT_DASHBOARD_GATE.PENDING_REVIEW, AGENT_DASHBOARD_GATE.MORE_INFORMATION];

/** A pending agent waiting on Kampmax (under review, or asked for more). */
export function isWaitingForReview(kind: AgentDashboardGateKind): boolean {
  return WAITING.includes(kind);
}

/**
 * Whether a waiting agent should see where their application stands instead of this page: on the overview and
 * on every page that only works after approval. Profile, verification and settings stay usable.
 */
export function showsPendingApplication(kind: AgentDashboardGateKind, pathname: string): boolean {
  return isWaitingForReview(kind) && (pathname === "/agent" || opensAfterApproval(pathname));
}
