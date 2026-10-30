// ============================================================
// FREELANCER DASHBOARD CONFIG  (Module 22 — Dashboard)
// ============================================================
// Presentation constants for the freelancer dashboard. No business logic,
// no money math — only display metadata.

import type { FreelancerActivityKind } from "@/types/freelancer-dashboard";

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
  "/freelancer/verification",
] as const;
