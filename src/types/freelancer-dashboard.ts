import type { Callout, FreelancerNextStep, JobPipeline, VerificationState } from "@/lib/freelancer-hub";
// ============================================================
// FREELANCER DASHBOARD TYPES  (Module 22 — Dashboard)
// ============================================================
//
// The dashboard service aggregates these from the profile, proposal, contract
// and wallet endpoints.
//
// BACKEND-AUTHORITATIVE: wallet figures, proposal/contract counts, profile approval,
// verification, availability and visibility all come from the backend. The UI only
// renders these values and never derives authoritative business numbers client-side.

import type { FreelancerOnboardingStatus } from "@/types/freelancer";

// ── Availability ────────────────────────────────────────────

export const FREELANCER_DASH_AVAILABILITY = {
  AVAILABLE: "available",
  AVAILABLE_LATER: "available_later",
  UNAVAILABLE: "unavailable",
} as const;

export type FreelancerDashAvailability =
  (typeof FREELANCER_DASH_AVAILABILITY)[keyof typeof FREELANCER_DASH_AVAILABILITY];

// ── Profile status summary ──────────────────────────────────

export interface FreelancerProfileSummary {
  headline?: string;
  bio?: string;
  photoUrl?: string | null;
  city?: string;
  remoteAvailable?: boolean;
  skills: string[];
}

export interface FreelancerProfileStatus {
  /** Publicly discoverable. Backend-owned — never forced here. */
  isPublic: boolean;
  /** Identity verification as the backend has it; only Kampmax changes it. */
  verification: VerificationState;
  /** The one profile step to do next, or null once the profile is complete. */
  nextStep: FreelancerNextStep | null;
}

// ── Proposal / contract / earnings summaries ────────────────

export interface FreelancerProposalSummary {
  /** Sent and still open (submitted, under review or shortlisted). */
  waiting: number;
  won: number;
  submitted: number;
  underReview: number;
  accepted: number;
  rejected: number;
}

export interface FreelancerContractSummary {
  active: number;
  completed: number;
}

// ── Dashboard statistics (backend-supplied or —) ────────────

export interface FreelancerDashboardMetric {
  key: "available" | "held" | "active_proposals" | "to_do";
  label: string;
  /** Pre-formatted display string. `—` when no real data exists. */
  valueLabel: string;
  tone: "neutral" | "info" | "success" | "gold";
  sublabel?: string;
}

// ── Activity feed ───────────────────────────────────────────

export const FREELANCER_ACTIVITY_KIND = {
  PROFILE_APPROVED: "profile_approved",
  PORTFOLIO_UPDATED: "portfolio_updated",
  PROPOSAL_SUBMITTED: "proposal_submitted",
  PROPOSAL_ACCEPTED: "proposal_accepted",
  CONTRACT_STARTED: "contract_started",
  PAYMENT_RECEIVED: "payment_received",
  REVIEW_RECEIVED: "review_received",
  AVAILABILITY_UPDATED: "availability_updated",
  SYSTEM_ANNOUNCEMENT: "system_announcement",
} as const;

export type FreelancerActivityKind =
  (typeof FREELANCER_ACTIVITY_KIND)[keyof typeof FREELANCER_ACTIVITY_KIND];

export interface FreelancerActivityEvent {
  id: string;
  kind: FreelancerActivityKind;
  title: string;
  message: string;
  href?: string;
  createdAt: string;
}

// ── Notifications summary (reuses the existing notification system) ─

export interface FreelancerNotificationSummary {
  unreadCount: number;
  sample: { id: string; title: string; body: string; createdAt: string }[];
}

// ── Dashboard aggregate ─────────────────────────────────────

export interface FreelancerDashboard {
  profile: FreelancerProfileSummary;
  profileStatus: FreelancerProfileStatus;
  metrics: FreelancerDashboardMetric[];
  availability: {
    status: FreelancerDashAvailability | null;
    label: string;
  };
  proposals: FreelancerProposalSummary;
  contracts: FreelancerContractSummary;
  /** Where the jobs stand: the freelancer's moves, work with clients, paid jobs. */
  pipeline: JobPipeline;
  /** What needs the freelancer now, in the mobile hub's words. Empty when nothing does. */
  callouts: Callout[];
  /** "Received ₦12,000 · Payment for Logo design", or null. */
  latestPayment: string | null;
  activity: FreelancerActivityEvent[];
}
