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
  status: FreelancerOnboardingStatus;
  completionPercentage: number;
  /** Missing/incomplete sections (for the "Complete profile" guidance). */
  missing: FreelancerProfileMissing[];
  /** Publicly discoverable. Backend-owned — never forced here. */
  isPublic: boolean;
  /** Identity verification state (user-facing only). */
  verification: "verified" | "pending" | "rejected" | "not_required";
}

export interface FreelancerProfileMissing {
  key: string;
  label: string;
  description: string;
  href: string;
}

// ── Proposal / contract / earnings summaries ────────────────

export interface FreelancerProposalSummary {
  submitted: number;
  underReview: number;
  accepted: number;
  rejected: number;
}

export interface FreelancerContractSummary {
  active: number;
  completed: number;
}

export interface FreelancerDeadline {
  id: string;
  title: string;
  dueDate: string;
}

/** Wallet figures. The dashboard's `earnings` is null when the wallet can't be read. */
export interface FreelancerEarningsSummary {
  pending: number;
  available: number;
}

// ── Dashboard statistics (backend-supplied or —) ────────────

export interface FreelancerDashboardMetric {
  key: "active_proposals" | "active_contracts" | "completed_projects" | "wallet_balance";
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
  deadlines: FreelancerDeadline[];
  earnings: FreelancerEarningsSummary | null;
  activity: FreelancerActivityEvent[];
}
