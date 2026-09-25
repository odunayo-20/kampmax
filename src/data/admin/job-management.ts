// ============================================================
// JOB MANAGEMENT DATA (Module 40)
// ============================================================
//
// Aggregates from EXISTING platform data stores — no fabricated
// records (spec §45/§42). Sources:
//   - src/data/opportunity.ts      — the real job/opportunity store
//   - src/data/employer.ts         — employer onboarding drafts
//   - src/config/employer.ts       — hiring category taxonomy (ecN)
//   - src/data/admin/campuses.ts   — campus names
//
// The proposal store in opportunity.ts IS the application store (Module
// 28) — proposals are applications, so there is exactly one hiring
// entity here, never a second application model.
//
// SECURITY: this module only ever READS the stores. No moderation
// transitions exist in the opportunity store (there is no approval
// transition and no job-reports store), so the admin console is
// deliberately read-only and every unsupported surface is honest-empty.
// ============================================================

import type {
  ManagedJobActivityEvent,
  ManagedJobApplicationStatus,
  ManagedJobApplicationsSummary,
  ManagedJobContractInfo,
  ManagedJobDetail,
  ManagedJobFacets,
  ManagedJobRow,
  ManagedJobStatusCounts,
} from "@/types/admin";
import type { Opportunity, Proposal } from "@/types/opportunity";
import { getEmployerOnboardingDraft } from "@/data/employer";
import { LEGACY_HIRING_CATEGORY_NAMES } from "@/config/employer";
import { getCampusShortName } from "@/data/admin/campuses";
import {
  getAllOpportunities,
  getProposalsForOpportunity,
  getProposalCountForOpportunity,
} from "@/data/opportunity";

/** Prefer the name delivered with the job (taxonomy); the legacy map only labels old demo ids. */
export function jobCategoryName(categoryId: string, categoryName?: string): string {
  return categoryName ?? LEGACY_HIRING_CATEGORY_NAMES[categoryId] ?? "Uncategorized";
}

// ------------------------------------------------------------
// DERIVED STATUS CONCEPTS (honest, from the single real status)
// ------------------------------------------------------------

const PUBLICATIONS = {
  open: "published",
  draft: "unpublished",
  pending_review: "unpublished",
  closed: "ended",
  expired: "ended",
  cancelled: "ended",
} as const;

export function publicationOf(
  status: Opportunity["status"]
): ManagedJobRow["publication"] {
  return PUBLICATIONS[status] as ManagedJobRow["publication"];
}

export function moderationOf(
  status: Opportunity["status"]
): ManagedJobRow["moderation"] {
  switch (status) {
    case "pending_review":
      return "pending_review";
    case "draft":
      return "not_submitted";
    default:
      return "not_applicable";
  }
}

function lastActivityOf(opp: Opportunity, proposals: Proposal[]): string {
  let latest = opp.postedAt;
  for (const p of proposals) {
    if (p.updatedAt > latest) latest = p.updatedAt;
  }
  return latest;
}

// ------------------------------------------------------------
// EMPLOYER PROJECTION
// ------------------------------------------------------------
// Same identity space as Module 37 (/admin/employers/:id): an employer
// id matches the admin employer console when an onboarding draft exists
// (u1), and maps to the public job-post owner otherwise.

function accountStatusOf(
  draft: ReturnType<typeof getEmployerOnboardingDraft>
): JobEmployerStatus {
  if (!draft) return "external";
  switch (draft.status) {
    case "APPROVED":
      return "active";
    case "SUSPENDED":
      return "suspended";
    case "REJECTED":
      return "rejected";
    case "PENDING_REVIEW":
      return "pending_review";
    default:
      return "pending_review";
  }
}

type JobEmployerStatus =
  | "active"
  | "pending_review"
  | "suspended"
  | "rejected"
  | "external";

export interface JobEmployerSource {
  id: string;
  name: string;
  organizationName: string | null;
  descriptor: string;
  verified: boolean;
  slug: string | null;
  campusId: string | null;
  campusName: string | null;
  location: string | null;
  accountStatus: "active" | "pending_review" | "suspended" | "rejected" | "external";
  jobsTotal: number;
}

export function employerSourceOf(
  ownerId: string,
  owner: Opportunity["employer"] | null,
  ownerJobs: Opportunity[]
): JobEmployerSource {
  const draft = getEmployerOnboardingDraft(ownerId);
  const draftOrg = draft?.organization.name || null;

  let name = owner?.name ?? ownerId;
  if (draft) {
    name = draft.profile.displayName || draftOrg || owner?.name || "Employer";
  }

  const campusId = draft?.location.campusId ?? null;
  const locationParts = [draft?.location.city, draft?.location.state, owner?.location]
    .filter((p): p is string => Boolean(p))
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    id: ownerId,
    name,
    organizationName: draftOrg,
    descriptor: owner?.descriptor ?? "External client",
    verified: draft ? draft.verification.status === "verified" : (owner?.verified ?? false),
    slug: draft?.approvedSlug ?? null,
    campusId,
    campusName: campusId ? getCampusShortName(campusId) : null,
    location: locationParts.length > 0 ? locationParts.join(", ") : null,
    accountStatus: accountStatusOf(draft),
    jobsTotal: ownerJobs.length,
  };
}

// ------------------------------------------------------------
// DATASET BUILDER
// ------------------------------------------------------------

export interface JobDataset {
  rows: ManagedJobRow[];
  details: Map<string, ManagedJobDetail>;
}

export function buildJobDataset(): JobDataset {
  const opps = getAllOpportunities().sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  const rows: ManagedJobRow[] = [];
  const details = new Map<string, ManagedJobDetail>();

  const owners = new Map<string, Opportunity["employer"]>();
  const byOwner = new Map<string, Opportunity[]>();
  for (const opp of opps) {
    if (!owners.has(opp.employer.id)) owners.set(opp.employer.id, opp.employer);
    const list = byOwner.get(opp.employer.id) ?? [];
    list.push(opp);
    byOwner.set(opp.employer.id, list);
  }

  for (const opp of opps) {
    const proposals = getProposalsForOpportunity(opp.id);
    const employerSource = employerSourceOf(
      opp.employer.id,
      opp.employer,
      byOwner.get(opp.employer.id) ?? []
    );
    const campusId = opp.location.campusId ?? null;
    const campusName = campusId ? getCampusShortName(campusId) : null;

    const row: ManagedJobRow = {
      id: opp.id,
      title: opp.title,
      summary: opp.summary,
      status: opp.status,
      publication: publicationOf(opp.status),
      moderation: moderationOf(opp.status),
      categoryId: opp.categoryId,
      categoryName: jobCategoryName(opp.categoryId, opp.categoryName),
      skills: opp.skills,
      workArrangement: opp.workArrangement,
      experienceLevel: opp.experienceLevel,
      duration: opp.duration,
      locationCity: opp.location.city ?? null,
      locationState: opp.location.state ?? null,
      campusId,
      campusName,
      budgetType: opp.budget.type,
      budgetMin: opp.budget.min ?? null,
      budgetMax: opp.budget.max ?? null,
      employerId: opp.employer.id,
      employerName: employerSource.name,
      organizationName: employerSource.organizationName,
      employerVerified: employerSource.verified,
      postedAt: opp.postedAt,
      deadline: opp.deadline,
      viewCount: opp.viewCount,
      applications: getProposalCountForOpportunity(opp.id),
      lastActivityAt: lastActivityOf(opp, proposals),
    };

    rows.push(row);
    details.set(opp.id, buildDetail(opp, employerSource, proposals));
  }

  return { rows, details };
}

// ------------------------------------------------------------
// DETAIL BUILDER
// ------------------------------------------------------------

function applicationSummary(proposals: Proposal[]): ManagedJobApplicationsSummary {
  const byStatus: Record<ManagedJobApplicationStatus | "all", number> = {
    submitted: 0,
    under_review: 0,
    shortlisted: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    all: 0,
  };
  let latestAt: string | null = null;
  let visible = 0;
  for (const p of proposals) {
    if (p.status in byStatus) byStatus[p.status as ManagedJobApplicationStatus] += 1;
    byStatus.all += 1;
    if (p.status !== "withdrawn") visible += 1;
    if (p.updatedAt > (latestAt ?? "")) latestAt = p.updatedAt;
  }
  return { total: byStatus.all, visible, byStatus, latestAt };
}

function contractInfoFor(_proposals: Proposal[]): ManagedJobContractInfo {
  // The contracts store links contracts to proposals by proposalId, but no
  // seed contract references the job's proposals and the store has no
  // proposal→contract lookup — an honest zero is the only truthful answer.
  return {
    count: 0,
    note: "No contracts are linked to this job's proposals. The contracts store offers no proposal→contract hook for these records (backend gap).",
  };
}

function buildActivity(opp: Opportunity, proposals: Proposal[]): ManagedJobActivityEvent[] {
  const events: ManagedJobActivityEvent[] = [];

  events.push({
    id: `act-posted-${opp.id}`,
    kind: "job",
    message: `Job "${opp.title}" was posted`,
    meta: opp.employer.name,
    at: opp.postedAt,
  });

  for (const p of proposals) {
    events.push({
      id: `act-prop-${p.id}`,
      kind: "application",
      message: `Application received from freelancer ${p.freelancerId}`,
      meta: p.status,
      at: p.submittedAt ?? p.createdAt,
    });
    if (p.status === "accepted") {
      events.push({
        id: `act-accept-${p.id}`,
        kind: "hiring",
        message: `Freelancer ${p.freelancerId} was hired for "${opp.title}"`,
        meta: p.proposedAmount != null ? `₦${p.proposedAmount.toLocaleString()}` : undefined,
        at: p.updatedAt,
      });
    }
  }

  if (opp.status === "expired" || opp.status === "closed") {
    events.push({
      id: `act-deadline-${opp.id}`,
      kind: "deadline",
      message: opp.status === "expired" ? "Submission deadline passed — job expired" : "Job closed",
      meta: opp.status,
      at: opp.deadline,
    });
  }

  events.sort((a, b) => b.at.localeCompare(a.at));
  return events;
}

function buildDetail(
  opp: Opportunity,
  employerSource: JobEmployerSource,
  proposals: Proposal[]
): ManagedJobDetail {
  const campusName = opp.location.campusId ? getCampusShortName(opp.location.campusId) : null;

  return {
    listing: {
      id: opp.id,
      title: opp.title,
      summary: opp.summary,
      description: opp.description,
      requirements: opp.requirements,
      skills: opp.skills,
      categoryId: opp.categoryId,
      categoryName: jobCategoryName(opp.categoryId, opp.categoryName),
      status: opp.status,
      publication: publicationOf(opp.status),
      moderation: moderationOf(opp.status),
      workArrangement: opp.workArrangement,
      experienceLevel: opp.experienceLevel,
      duration: opp.duration,
      budgetType: opp.budget.type,
      budgetMin: opp.budget.min ?? null,
      budgetMax: opp.budget.max ?? null,
      currency: "NGN",
      location: {
        city: opp.location.city,
        state: opp.location.state,
        campusId: opp.location.campusId,
        campusName: campusName ?? undefined,
        remote: opp.location.remote,
      },
      postedAt: opp.postedAt,
      deadline: opp.deadline,
      viewCount: opp.viewCount,
      employersReported: 0,
    },
    employer: {
      id: employerSource.id,
      name: employerSource.name,
      organizationName: employerSource.organizationName,
      descriptor: employerSource.descriptor,
      verified: employerSource.verified,
      accountStatus: employerSource.accountStatus,
      campusId: employerSource.campusId,
      campusName: employerSource.campusName,
      location: employerSource.location,
      slug: employerSource.slug,
      jobsTotal: employerSource.jobsTotal,
    },
    applications: applicationSummary(proposals),
    contracts: contractInfoFor(proposals),
    activity: buildActivity(opp, proposals),
  };
}

// ------------------------------------------------------------
// QUERY HELPERS
// ------------------------------------------------------------

export function filterJobs(
  rows: ManagedJobRow[],
  query: {
    search?: string;
    status?: ManagedJobRow["status"] | "all";
    publication?: ManagedJobRow["publication"] | "all";
    categoryId?: string | "all";
    campusId?: string | "all";
    employerId?: string | "all";
    arrangement?: ManagedJobRow["workArrangement"] | "all";
    sortBy?: string;
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }
): { items: ManagedJobRow[]; total: number; page: number; totalPages: number } {
  let filtered = [...rows];

  const search = query.search?.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(search) ||
        j.id.toLowerCase().includes(search) ||
        j.employerName.toLowerCase().includes(search) ||
        (j.organizationName ?? "").toLowerCase().includes(search) ||
        j.categoryName.toLowerCase().includes(search) ||
        j.skills.some((s) => s.toLowerCase().includes(search))
    );
  }

  if (query.status && query.status !== "all") {
    filtered = filtered.filter((j) => j.status === query.status);
  }
  if (query.publication && query.publication !== "all") {
    filtered = filtered.filter((j) => j.publication === query.publication);
  }
  if (query.categoryId && query.categoryId !== "all") {
    filtered = filtered.filter((j) => j.categoryId === query.categoryId);
  }
  if (query.campusId && query.campusId !== "all") {
    filtered = filtered.filter((j) => j.campusId === query.campusId);
  }
  if (query.employerId && query.employerId !== "all") {
    filtered = filtered.filter((j) => j.employerId === query.employerId);
  }
  if (query.arrangement && query.arrangement !== "all") {
    filtered = filtered.filter((j) => j.workArrangement === query.arrangement);
  }

  filtered = sortJobs(filtered, query.sortBy ?? "postedAt", query.sortDir ?? "desc");

  const total = filtered.length;
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function sortJobs(
  list: ManagedJobRow[],
  sortBy: string,
  sortDir: "asc" | "desc"
): ManagedJobRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const budgetOf = (j: ManagedJobRow) => j.budgetMax ?? j.budgetMin ?? 0;
  const compareNum = (a: number, b: number) => (a - b) * dir;
  const compareStr = (a: string, b: string) => a.localeCompare(b) * dir;

  const sorted = [...list];
  switch (sortBy) {
    case "title":
      sorted.sort((a, b) => compareStr(a.title, b.title));
      break;
    case "deadline":
      sorted.sort((a, b) => compareNum(+new Date(a.deadline), +new Date(b.deadline)));
      break;
    case "viewCount":
      sorted.sort((a, b) => compareNum(a.viewCount, b.viewCount));
      break;
    case "applications":
      sorted.sort((a, b) => compareNum(a.applications, b.applications));
      break;
    case "budget":
      sorted.sort((a, b) => compareNum(budgetOf(a), budgetOf(b)));
      break;
    case "lastActivity":
      sorted.sort((a, b) => compareNum(+new Date(a.lastActivityAt), +new Date(b.lastActivityAt)));
      break;
    case "postedAt":
    default:
      sorted.sort((a, b) => compareNum(+new Date(a.postedAt), +new Date(b.postedAt)));
      break;
  }
  return sorted;
}

export function computeJobCounts(rows: ManagedJobRow[]): ManagedJobStatusCounts {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 86_400_000;
  return {
    all: rows.length,
    open: rows.filter((j) => j.status === "open").length,
    draft: rows.filter((j) => j.status === "draft").length,
    pending_review: rows.filter((j) => j.status === "pending_review").length,
    closed: rows.filter((j) => j.status === "closed").length,
    expired: rows.filter((j) => j.status === "expired").length,
    cancelled: rows.filter((j) => j.status === "cancelled").length,
    withApplications: rows.filter((j) => j.applications > 0).length,
    expiringSoon: rows.filter(
      (j) => j.status === "open" && +new Date(j.deadline) - now <= SEVEN_DAYS
    ).length,
    reported: 0,
  };
}

export function computeJobFacets(rows: ManagedJobRow[]): ManagedJobFacets {
  const categories: ManagedJobFacets["categories"] = [];
  const categoriesMap = new Map<string, number>();
  const campusesMap = new Map<string, number>();
  const employersMap = new Map<string, number>();

  for (const j of rows) {
    categoriesMap.set(j.categoryId, (categoriesMap.get(j.categoryId) ?? 0) + 1);
    if (j.campusId) campusesMap.set(j.campusId, (campusesMap.get(j.campusId) ?? 0) + 1);
    employersMap.set(j.employerId, (employersMap.get(j.employerId) ?? 0) + 1);
  }

  for (const [id, count] of categoriesMap) {
    const sample = rows.find((r) => r.categoryId === id);
    categories.push({ id, name: sample?.categoryName ?? jobCategoryName(id), count });
  }
  categories.sort((a, b) => a.name.localeCompare(b.name));

  const campuses = Array.from(campusesMap.entries())
    .map(([id, count]) => ({ id, name: getCampusShortName(id), count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const employers = Array.from(employersMap.entries())
    .map(([id, count]) => {
      const row = rows.find((r) => r.employerId === id);
      return { id, name: row?.employerName ?? id, count };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { categories, campuses, employers };
}