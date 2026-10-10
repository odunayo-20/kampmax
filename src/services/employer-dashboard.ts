// ============================================================
// EMPLOYER DASHBOARD SERVICE  (Module 29)
// ============================================================
//
// Orchestration facade over the existing owner-scoped employer data
// modules (jobs, applications, contracts, employer profile). There is
// no dashboard "endpoint" yet, so this service composes the existing
// authorized reads under ONE summary — the exact shape a future
// `GET /employers/me/dashboard` would return.
//
// SECURITY: every read below is already owner-scoped by its source
// module. This facade adds nothing client-trustable: no ids, roles,
// financial figures or ownership flags are accepted from the UI.

import {
  getMyJobCountsApi,
  getMyJobsApi,
} from "@/services/opportunity";
import { getReceivedApplicationsApi } from "@/services/proposals";
import { listMyEmployerEngagements, type Engagement, type EngagementStatus } from "@/services/jobs";
import {
  backendProfileCompletion,
  getEmployerProfileApi,
} from "@/services/employer";
import { CONTRACT_STATUS } from "@/types/contract";
import type { ContractStatus } from "@/types/contract";
import type {
  EmployerApplicationStatus,
  EmployerApplicationSummary,
  OpportunityStatus,
} from "@/types/opportunity";

// ── Types ────────────────────────────────────────────────────

export interface EmployerDashboardJob {
  id: string;
  title: string;
  status: OpportunityStatus;
  applications: number;
  postedAt: string;
  deadline: string;
  budgetMin?: number;
  budgetMax?: number;
}

export interface EmployerDashboardContract {
  id: string;
  projectTitle: string;
  status: ContractStatus;
  freelancerName: string;
  deadline: string;
  nextAction: string;
  outstandingDeliverables: number;
  amount?: number;
  /** Backend engagement status, so the right next-step actions can be offered. */
  engagementStatus: EngagementStatus;
}

export interface EmployerAttentionItem {
  id: string;
  tone: "info" | "warning" | "neutral";
  title: string;
  detail: string;
  href: string;
}

export interface EmployerDashboardSummary {
  company: {
    name: string;
    descriptor: string;
    location: string;
    verified: boolean;
    profileCompletion: number;
  };
  jobCounts: Record<OpportunityStatus, number> & { all: number };
  appCounts: Record<EmployerApplicationStatus | "all", number>;
  recentJobs: EmployerDashboardJob[];
  recentApplications: EmployerApplicationSummary[];
  contracts: {
    total: number;
    active: number;
    awaitingClientReview: number;
    pendingAcceptance: number;
    recent: EmployerDashboardContract[];
  };
  pendingActions: number;
  attention: EmployerAttentionItem[];
}

// ── Mapping helpers ──────────────────────────────────────────

function buildAttentionFrom(
  appCounts: Record<EmployerApplicationStatus | "all", number>,
  contracts: { status: ContractStatus }[],
  jobCounts: Record<OpportunityStatus, number> & { all: number },
  profileCompletion: number
): EmployerAttentionItem[] {
  const items: EmployerAttentionItem[] = [];

  if (appCounts.submitted > 0) {
    items.push({
      id: "new_applications",
      tone: "info",
      title: "Review new applications",
      detail: `${appCounts.submitted} application${appCounts.submitted === 1 ? "" : "s"} waiting for your first review.`,
      href: "/employer/applications?status=submitted",
    });
  }

  if (appCounts.shortlisted > 0) {
    items.push({
      id: "shortlisted",
      tone: "neutral",
      title: "Decide on shortlisted candidates",
      detail: `${appCounts.shortlisted} candidate${appCounts.shortlisted === 1 ? "" : "s"} are shortlisted in your pipeline.`,
      href: "/employer/applications?status=shortlisted",
    });
  }

  const awaitingClientReview = contracts.filter(
    (c) => c.status === CONTRACT_STATUS.AWAITING_CLIENT_REVIEW
  ).length;
  if (awaitingClientReview > 0) {
    items.push({
      id: "contracts_review",
      tone: "warning",
      title: "Review submitted deliverables",
      detail: `${awaitingClientReview} contract${awaitingClientReview === 1 ? "" : "s"} with work ready for your review.`,
      href: "/employer/contracts",
    });
  }

  if (jobCounts.draft > 0) {
    items.push({
      id: "draft_jobs",
      tone: "neutral",
      title: "Finish drafting a job",
      detail: `${jobCounts.draft} draft job${jobCounts.draft === 1 ? "" : "s"} ready to submit for review.`,
      href: "/employer/jobs?status=draft",
    });
  }

  if (profileCompletion < 100) {
    items.push({
      id: "profile",
      tone: "warning",
      title: "Complete your employer profile",
      detail: `Profile is ${profileCompletion}% complete — finishing it unlocks trust badges and better candidates.`,
      href: "/onboarding/employer",
    });
  }

  return items;
}

// Engagement -> the dashboard's contract vocabulary. An accepted proposal
// starts as PENDING_PAYMENT; the employer funds it, work runs, the freelancer
// submits, and the employer reviews.
const ENGAGEMENT_TO_CONTRACT: Record<EngagementStatus, ContractStatus> = {
  PENDING_PAYMENT: CONTRACT_STATUS.PENDING_ACCEPTANCE,
  FUNDED: CONTRACT_STATUS.ACTIVE,
  IN_PROGRESS: CONTRACT_STATUS.ACTIVE,
  SUBMITTED: CONTRACT_STATUS.AWAITING_CLIENT_REVIEW,
  COMPLETED: CONTRACT_STATUS.COMPLETED,
  DISPUTED: CONTRACT_STATUS.DISPUTED,
  CANCELLED: CONTRACT_STATUS.CANCELLED,
};

const ENGAGEMENT_NEXT_ACTION: Record<EngagementStatus, string> = {
  PENDING_PAYMENT: "Fund the engagement to start work",
  FUNDED: "Waiting for the freelancer to start",
  IN_PROGRESS: "Work in progress",
  SUBMITTED: "Review the submitted work",
  COMPLETED: "Completed",
  DISPUTED: "Under dispute",
  CANCELLED: "Cancelled",
};

export function engagementToDashboardContract(e: Engagement): EmployerDashboardContract {
  return {
    id: e.id,
    projectTitle: e.job?.title ?? "Project",
    status: ENGAGEMENT_TO_CONTRACT[e.status] ?? CONTRACT_STATUS.ACTIVE,
    freelancerName: e.freelancer?.fullName || e.freelancer?.username || "Freelancer",
    deadline: e.expectedCompletionDate ?? "",
    nextAction: ENGAGEMENT_NEXT_ACTION[e.status] ?? "",
    outstandingDeliverables: 0,
    amount: Number(e.agreedAmount),
    engagementStatus: e.status,
  };
}

/** The employer's engagements (hires), newest first. Endpoint: GET /engagements/employer/me */
export async function getEmployerContractsApi(): Promise<EmployerDashboardContract[]> {
  const { engagements, error } = await listMyEmployerEngagements({ limit: 100 });
  if (error) throw error;
  return engagements
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(engagementToDashboardContract);
}

/**
 * The employer dashboard, composed from the real owner-scoped endpoints:
 * profile, my jobs (+counts), received applications (+counts) and my
 * engagements. Returns null when the user has no employer profile.
 */
export async function getEmployerDashboardApi(): Promise<EmployerDashboardSummary | null> {
  const { profile, error: profileError } = await getEmployerProfileApi();
  if (profileError) {
    if (profileError.status === 404) return null;
    throw profileError;
  }
  if (!profile) return null;

  const [jobs, apps, jobCounts, contracts] = await Promise.all([
    getMyJobsApi(1, 5),
    getReceivedApplicationsApi({ page: 1, size: 5, sort: "newest" }),
    getMyJobCountsApi(),
    getEmployerContractsApi(),
  ]);
  for (const { error } of [jobs, apps, jobCounts]) if (error) throw error;

  const appCounts = apps.page.counts;
  // Same calculation as the profile page, so the two always show one number.
  const profileCompletion = backendProfileCompletion(profile);

  const attention = buildAttentionFrom(appCounts, contracts, jobCounts.counts, profileCompletion);

  return {
    company: {
      name: String(profile.companyName || profile.displayName || "Your company"),
      descriptor: String(profile.industry ?? ""),
      location: String(profile.location ?? ""),
      verified: String(profile.verificationStatus).toUpperCase() === "VERIFIED",
      profileCompletion,
    },
    jobCounts: jobCounts.counts,
    appCounts,
    recentJobs: jobs.page.items.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      applications: job.proposalCount,
      postedAt: job.postedAt,
      deadline: job.deadline,
      budgetMin: job.budget.min,
      budgetMax: job.budget.max,
    })),
    recentApplications: apps.page.items,
    contracts: {
      total: contracts.length,
      active: contracts.filter((c) => c.status === CONTRACT_STATUS.ACTIVE).length,
      awaitingClientReview: contracts.filter(
        (c) => c.status === CONTRACT_STATUS.AWAITING_CLIENT_REVIEW
      ).length,
      pendingAcceptance: contracts.filter(
        (c) => c.status === CONTRACT_STATUS.PENDING_ACCEPTANCE
      ).length,
      recent: contracts.slice(0, 5),
    },
    pendingActions: attention.length,
    attention,
  };
}

// getEmployerDashboardAccessApi lives in services/employer.ts (the single
// backend-authoritative access-gate check, used by app/(main)/employer/
// layout.tsx) — it is not duplicated here.
