/**
 * An employer's postings in three plain groups instead of seven raw statuses: live, not live yet, and ended. Plus
 * the headline, search, the review link and the expired-posting note. The mobile app's lib/employer-jobs.ts
 * (tabOf, jobsHeadline, responseText, canRenew, visibleJobs) says the same.
 */

import { isHiringType, OPPORTUNITY_STATUS, type Opportunity, type OpportunityStatus } from "@/types/opportunity";

export type JobGroup = "live" | "draft" | "ended";

export const JOB_GROUPS: { id: JobGroup; label: string; empty: string }[] = [
  { id: "live", label: "Live", empty: "Nothing live right now. Publish a job and people can start responding." },
  { id: "draft", label: "Not live yet", empty: "Jobs you have started but not published show up here." },
  { id: "ended", label: "Ended", empty: "Closed, cancelled and expired jobs show up here." },
];

export function jobGroup(status: OpportunityStatus): JobGroup {
  if (status === OPPORTUNITY_STATUS.OPEN) return "live";
  if (status === OPPORTUNITY_STATUS.DRAFT || status === OPPORTUNITY_STATUS.PENDING_REVIEW) return "draft";
  return "ended";
}

/** Open on live jobs; when there are none, on drafts, then on the rest. */
/** The group a link asks for: `?group=live|draft|ended`, or an old `?status=open|draft` link. Null when none. */
export function groupFromParams(params: { get: (k: string) => string | null }): JobGroup | null {
  const g = params.get("group");
  if (g === "live" || g === "draft" || g === "ended") return g;
  const status = params.get("status");
  return status === "open" ? "live" : status === "draft" ? "draft" : null;
}

export function defaultJobGroup(jobs: Pick<Opportunity, "status">[]): JobGroup {
  for (const g of ["live", "draft"] as const) if (jobs.some((j) => jobGroup(j.status) === g)) return g;
  return "ended";
}

/** "5 responses on your live jobs", else how many are not live yet, else null. Only gigs carry a count. */
export function jobsHeadline(jobs: Pick<Opportunity, "status" | "proposalCount" | "opportunityType">[]): string | null {
  const waiting = jobs.filter((j) => j.status === OPPORTUNITY_STATUS.OPEN && !isHiringType(j.opportunityType)).reduce((n, j) => n + j.proposalCount, 0);
  if (waiting > 0) return `${waiting} ${waiting === 1 ? "response" : "responses"} on your live jobs`;
  const drafts = jobs.filter((j) => j.status === OPPORTUNITY_STATUS.DRAFT).length;
  return drafts > 0 ? `${drafts} ${drafts === 1 ? "job is" : "jobs are"} not live yet` : null;
}

/** The jobs under one group, filtered by a search over the title. */
export function visibleJobs<T extends Pick<Opportunity, "status" | "title">>(jobs: T[], group: JobGroup, search: string): T[] {
  const q = search.trim().toLowerCase();
  return jobs.filter((j) => jobGroup(j.status) === group && (!q || j.title.toLowerCase().includes(q)));
}

/**
 * The button to the people who responded, on the job's responses page (where a gig's proposal is accepted and an
 * applicant is hired). A vacancy or internship always opens its applicants (the backend counts only gig proposals,
 * so there is no number to show); a gig says how many proposals it has.
 */
export function reviewLink(job: Pick<Opportunity, "id" | "status" | "opportunityType" | "proposalCount">): { label: string; href: string; enabled: boolean; strong: boolean } {
  const href = `/employer/jobs/${job.id}/applications`;
  if (isHiringType(job.opportunityType)) {
    return { label: "See applicants", href, enabled: job.status !== OPPORTUNITY_STATUS.DRAFT, strong: false };
  }
  const n = job.proposalCount;
  return {
    label: n === 0 ? "No proposals yet" : `Review ${n} ${n === 1 ? "proposal" : "proposals"}`,
    href,
    enabled: n > 0,
    strong: n > 0,
  };
}

/** A paid vacancy or internship whose posting period has ended: it can be renewed to take applicants again. */
export function postingLapsed(job: Pick<Opportunity, "status" | "opportunityType" | "expiresAt">, now = Date.now()): boolean {
  if (!isHiringType(job.opportunityType)) return false;
  if (job.status === OPPORTUNITY_STATUS.EXPIRED) return true;
  return job.status === OPPORTUNITY_STATUS.OPEN && !!job.expiresAt && Date.parse(job.expiresAt) <= now;
}

export const LAPSED_NOTE = "The posting period ended. Renew it to take applicants again.";
