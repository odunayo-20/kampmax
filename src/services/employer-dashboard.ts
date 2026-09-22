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

import { apiClient } from "@/lib/api-client";
import { getCurrentUser, getUserById } from "@/services/users";
import {
  getEmployerJobsPage,
  getEmployerJobsSummary,
  getEmployerApplicationsPage,
  getEmployerApplicationsSummary,
} from "@/services/opportunity";
import {
  computeEmployerCompletion,
  getEmployerOnboardingDraftForUser,
  getEmployerPublicPreview,
} from "@/services/employer";
import { getContractsForEmployer } from "@/data/contracts";
import { getProposalById } from "@/data/opportunity";
import { CONTRACT_STATUS } from "@/types/contract";
import type { ContractStatus } from "@/types/contract";
import type { Contract } from "@/types/contract";
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

function toDashboardContract(contract: Contract): EmployerDashboardContract {
  const proposal = contract.proposalId ? getProposalById(contract.proposalId) : undefined;
  const freelancerName = proposal
    ? (getUserById(proposal.freelancerId)?.name ?? "Freelancer")
    : "Freelancer";
  return {
    id: contract.id,
    projectTitle: contract.projectTitle,
    status: contract.status,
    freelancerName,
    deadline: contract.deadline,
    nextAction: contract.nextAction,
    outstandingDeliverables: contract.outstandingDeliverables,
    amount: contract.agreedAmount,
  };
}

function buildAttention(
  appCounts: Record<EmployerApplicationStatus | "all", number>,
  contracts: Contract[],
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

// ── Public API ───────────────────────────────────────────────

/**
 * Single backend-style summary for the employer dashboard. Returns null
 * when the current user has no employer profile (the shell gate already
 * blocks this, but the read stays defensive).
 */
export function getEmployerDashboardSummary(): EmployerDashboardSummary | null {
  const user = getCurrentUser();
  if (!user) return null;

  const draft = getEmployerOnboardingDraftForUser();
  const preview = getEmployerPublicPreview(draft);
  if (!preview) return null;

  const jobCounts = getEmployerJobsSummary();
  const appCounts = getEmployerApplicationsSummary();
  const jobsPage = getEmployerJobsPage({ status: "all", sort: "newest", page: 1, size: 5 });
  const appsPage = getEmployerApplicationsPage({ status: "all", sort: "newest", page: 1, size: 5 });
  const employerContracts = getContractsForEmployer(user.id);
  const profileCompletion = computeEmployerCompletion(draft);

  const recentJobs: EmployerDashboardJob[] = jobsPage.items.map((job) => ({
    id: job.id,
    title: job.title,
    status: job.status,
    applications: job.proposalCount,
    postedAt: job.postedAt,
    deadline: job.deadline,
    budgetMin: job.budget.min,
    budgetMax: job.budget.max,
  }));

  const sortedContracts = [...employerContracts].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  const attention = buildAttention(appCounts, employerContracts, jobCounts, profileCompletion);

  return {
    company: {
      name: preview.name,
      descriptor: preview.descriptor,
      location: preview.location,
      verified: preview.verified,
      profileCompletion,
    },
    jobCounts,
    appCounts,
    recentJobs,
    recentApplications: appsPage.items,
    contracts: {
      total: employerContracts.length,
      active: employerContracts.filter((c) => c.status === CONTRACT_STATUS.ACTIVE).length,
      awaitingClientReview: employerContracts.filter(
        (c) => c.status === CONTRACT_STATUS.AWAITING_CLIENT_REVIEW
      ).length,
      pendingAcceptance: employerContracts.filter(
        (c) => c.status === CONTRACT_STATUS.PENDING_ACCEPTANCE
      ).length,
      recent: sortedContracts.slice(0, 5).map(toDashboardContract),
    },
    pendingActions: attention.length,
    attention,
  };
}

/**
 * Full employer contract read (owner-scoped) for the /employer/contracts
 * page. Sorted newest-first by last activity.
 */
export function getEmployerContracts(): EmployerDashboardContract[] {
  const user = getCurrentUser();
  if (!user) return [];
  return getContractsForEmployer(user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toDashboardContract);
}