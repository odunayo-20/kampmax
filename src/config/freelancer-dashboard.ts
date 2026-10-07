// ============================================================
// FREELANCER DASHBOARD CONFIG  (Module 22 — Dashboard)
// ============================================================
// Presentation constants for the freelancer dashboard. No business logic,
// no money math — only labels, orderings and display metadata.

import type { FreelancerActivityKind, FreelancerDashboardMetric } from "@/types/freelancer-dashboard";

// ── Metric icon/order metadata ──────────────────────────────

export type FreelancerMetricKey = FreelancerDashboardMetric["key"];

export const FREELANCER_METRIC_ORDER: FreelancerMetricKey[] = [
  "active_proposals",
  "active_contracts",
  "completed_projects",
  "total_earnings",
];

export const FREELANCER_METRIC_META: Record<FreelancerMetricKey, { label: string }> = {
  active_proposals: { label: "Active Proposals" },
  active_contracts: { label: "Active Contracts" },
  completed_projects: { label: "Completed Projects" },
  total_earnings: { label: "Total Earnings" },
};

// ── Availability options ────────────────────────────────────

export const FREELANCER_AVAILABILITY_LABEL: Record<string, string> = {
  available: "Available for work",
  available_later: "Available later",
  unavailable: "Not available",
};

// ── Activity metadata (colour-free + icon by kind) ──────────

export const FREELANCER_ACTIVITY_META: Record<
  FreelancerActivityKind,
  { icon: "check" | "briefcase" | "file" | "clock" | "wallet" | "star" | "calendar" | "megaphone" }
> = {
  profile_approved: { icon: "check" },
  portfolio_updated: { icon: "briefcase" },
  proposal_submitted: { icon: "file" },
  proposal_accepted: { icon: "check" },
  contract_started: { icon: "briefcase" },
  payment_received: { icon: "wallet" },
  review_received: { icon: "star" },
  availability_updated: { icon: "calendar" },
  system_announcement: { icon: "megaphone" },
};

// ── Dashboard sections for the `isFreelancerDashboardPath` helper ─

export const FREELANCER_DASHBOARD_SECTIONS = [
  "/freelancer",
  "/freelancer/dashboard",
  "/freelancer/profile",
  "/freelancer/settings",
  "/freelancer/contracts",
  "/freelancer/earnings",
  "/freelancer/transactions",
  "/freelancer/payouts",
  "/freelancer/payout-methods",
  "/freelancer/services",
  "/freelancer/portfolio",
  "/freelancer/find-work",
  "/freelancer/proposals",
  "/freelancer/saved-jobs",
] as const;
