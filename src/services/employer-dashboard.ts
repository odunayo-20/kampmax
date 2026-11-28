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
import { ENGAGEMENT_TO_CONTRACT_STATUS } from "@/services/contract";
import { listMyEmployerEngagements, type Engagement, type EngagementStatus } from "@/services/jobs";
import {
  employerNextStep,
  getEmployerProfileApi,
} from "@/services/employer";
import { getEmployerInsightsApi, type EmployerInsights, type HiringPipeline } from "@/services/employer-insights";
import { CONTRACT_STATUS } from "@/types/contract";
import type { ContractStatus } from "@/types/contract";
import type {
  EmployerApplicationSummary,
  OpportunityStatus,
} from "@/types/opportunity";
import { peopleHref } from "@/services/employer-people";
import { isMyMove } from "@/lib/contract-groups";
import { heldInEscrow, type NextStep } from "@/lib/employer-hub";

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
  /** The raw engagement, for the revision / dispute / cancellation details. */
  engagement: Engagement;
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
    /** The one profile step to do next, or null once it is complete. */
    nextStep: NextStep | null;
  };
  jobCounts: Record<OpportunityStatus, number> & { all: number };
  recentJobs: EmployerDashboardJob[];
  recentApplications: EmployerApplicationSummary[];
  contracts: {
    total: number;
    active: number;
    awaitingClientReview: number;
    /** Contracts where the next move is the employer's (fund it, or review sent work). */
    waitingOnYou: number;
    /** The money held for the current step of each funded contract. */
    held: { total: number; count: number };
    recent: EmployerDashboardContract[];
  };
  attention: EmployerAttentionItem[];
  /** Where people stand across open postings, and how candidates see this employer. */
  insights: EmployerInsights;
}

// ── Mapping helpers ──────────────────────────────────────────

function buildAttentionFrom(
  pipeline: HiringPipeline,
  waitingOnYou: number,
  drafts: number,
  verificationRejected: boolean,
  nextStep: NextStep | null
): EmployerAttentionItem[] {
  const items: EmployerAttentionItem[] = [];
  const people = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  if (waitingOnYou > 0) {
    items.push({
      id: "contracts",
      tone: "warning",
      title: `${people(waitingOnYou, "contract", "contracts")} waiting for you`,
      detail: "Fund a contract to start the work, or review work that was sent.",
      href: "/employer/contracts",
    });
  }
  if (pipeline.new > 0) {
    items.push({
      id: "new_applications",
      tone: "info",
      title: "Review new applications",
      detail: `${people(pipeline.new, "person is", "people are")} waiting for your first look.`,
      href: peopleHref("NEW"),
    });
  }
  if (pipeline.shortlisted > 0) {
    items.push({
      id: "shortlisted",
      tone: "neutral",
      title: "Decide on shortlisted candidates",
      detail: `${people(pipeline.shortlisted, "candidate is", "candidates are")} on your shortlist.`,
      href: peopleHref("SHORTLISTED"),
    });
  }
  if (verificationRejected) {
    items.push({
      id: "verify",
      tone: "warning",
      title: "Your verification was not approved",
      detail: "Update your profile, then contact support.",
      href: "/employer/profile",
    });
  }
  if (drafts > 0) {
    items.push({
      id: "draft_jobs",
      tone: "neutral",
      title: drafts === 1 ? "You have a job that is not live yet" : `You have ${drafts} jobs that are not live yet`,
      detail: "Publish it when it is ready, or discard it.",
      href: "/employer/jobs?group=draft",
    });
  }
  if (nextStep) {
    items.push({
      id: "profile",
      tone: "neutral",
      title: nextStep.title,
      detail: nextStep.detail,
      href: "/employer/profile/edit",
    });
  }
  return items;
}

// An accepted proposal starts as PENDING_PAYMENT; the employer funds it, work
// runs, the freelancer submits, and the employer reviews. The status mapping is
// shared with the freelancer's view (services/contract) so the two never drift.
const ENGAGEMENT_NEXT_ACTION: Record<EngagementStatus, string> = {
  PENDING_PAYMENT: "Fund the engagement to start work",
  FUNDED: "Waiting for the freelancer to start",
  IN_PROGRESS: "Work in progress",
  SUBMITTED: "Review the submitted work",
  REVISION_REQUESTED: "Waiting for the freelancer to resubmit",
  COMPLETED: "Completed",
  DISPUTED: "Under dispute — the payment is on hold while we review",
  CANCELLED: "Cancelled",
};

export function engagementToDashboardContract(e: Engagement): EmployerDashboardContract {
  return {
    id: e.id,
    projectTitle: e.job?.title ?? "Project",
    status: ENGAGEMENT_TO_CONTRACT_STATUS[e.status] ?? CONTRACT_STATUS.ACTIVE,
    freelancerName: e.freelancer?.fullName || e.freelancer?.username || "Freelancer",
    deadline: e.expectedCompletionDate ?? "",
    nextAction: ENGAGEMENT_NEXT_ACTION[e.status] ?? "",
    outstandingDeliverables: 0,
    amount: Number(e.agreedAmount),
    engagementStatus: e.status,
    engagement: e,
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

  const [jobs, apps, jobCounts, contracts, insights] = await Promise.all([
    getMyJobsApi(1, 5),
    getReceivedApplicationsApi({ page: 1, size: 5, sort: "newest" }),
    getMyJobCountsApi(),
    getEmployerContractsApi(),
    getEmployerInsightsApi(),
  ]);
  for (const { error } of [jobs, apps, jobCounts]) if (error) throw error;

  // The same next step as the profile page.
  const nextStep = employerNextStep(profile);
  const engagements = contracts.map((c) => c.engagement);
  const waitingOnYou = engagements.filter((e) => isMyMove(e, "employer")).length;
  const rejected = String(profile.verificationStatus).toUpperCase() === "REJECTED";

  const attention = buildAttentionFrom(insights.pipeline, waitingOnYou, jobCounts.counts.draft, rejected, nextStep);

  return {
    company: {
      name: String(profile.companyName || profile.displayName || "Your company"),
      descriptor: String(profile.industry ?? ""),
      location: String(profile.location ?? ""),
      verified: String(profile.verificationStatus).toUpperCase() === "VERIFIED",
      nextStep,
    },
    jobCounts: jobCounts.counts,
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
      waitingOnYou,
      held: heldInEscrow(engagements),
      recent: contracts.slice(0, 5),
    },
    attention,
    insights,
  };
}

// getEmployerDashboardAccessApi lives in services/employer.ts (the single
// backend-authoritative access-gate check, used by app/(main)/employer/
// layout.tsx) — it is not duplicated here.
