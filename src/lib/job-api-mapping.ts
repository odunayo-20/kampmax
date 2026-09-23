/**
 * Maps the real backend Job resource (services/jobs.ts, GET /jobs, GET
 * /jobs/:id) onto the frontend's Opportunity view model (types/opportunity.ts)
 * so the existing jobs-browse UI can render real data without every
 * consuming component being rewritten.
 *
 * This is a READ-ONLY, one-directional mapping. Several Opportunity fields
 * (requirements, screeningQuestions, attachments, viewCount, duration) have
 * no backend equivalent yet and are defaulted rather than fabricated.
 * Employer job creation/editing still targets the mock store
 * (services/opportunity.ts) until the write-side DTOs (skill-name-to-id
 * resolution, budget/experience vocabulary) are reconciled with the
 * backend — see the audit notes in hooks/use-jobs.ts.
 */
import type { Job, JobBrowseQuery } from "@/services/jobs";
import type {
  Opportunity,
  OpportunityBudgetType,
  OpportunityStatus,
  OpportunityWorkArrangement,
} from "@/types/opportunity";

const STATUS_MAP: Record<string, OpportunityStatus> = {
  DRAFT: "draft",
  PUBLISHED: "open",
  PAUSED: "closed",
  CLOSED: "closed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

const BUDGET_TYPE_MAP: Record<string, OpportunityBudgetType> = {
  FIXED: "project",
  HOURLY: "hourly",
};

const LOCATION_TYPE_MAP: Record<string, OpportunityWorkArrangement> = {
  REMOTE: "remote",
  ONSITE: "on_site",
  HYBRID: "hybrid",
};

// Frontend filter vocabulary (config/employer.ts EMPLOYER_EXPERIENCE_LEVELS)
// does not match the backend ExperienceLevel enum (JUNIOR/MIDLEVEL/SENIOR/
// EXPERT) — the backend rejects unrecognized values with a 400, so filter
// values must be translated rather than passed through.
const EXPERIENCE_FILTER_TO_BACKEND: Record<string, string> = {
  entry_level: "JUNIOR",
  intermediate: "MIDLEVEL",
  experienced: "SENIOR",
  expert: "EXPERT",
};

const ARRANGEMENT_FILTER_TO_BACKEND: Record<string, string> = {
  remote: "REMOTE",
  on_site: "ONSITE",
  on_campus: "ONSITE",
  hybrid: "HYBRID",
};

const SUPPORTED_SORTS = new Set(["newest", "oldest", "deadline"]);

export function jobToOpportunity(job: Job): Opportunity {
  const description = job.description ?? "";
  return {
    id: job.id,
    title: job.title,
    categoryId: job.category?.id ?? "",
    summary: description.length > 160 ? `${description.slice(0, 157)}...` : description,
    description,
    requirements: "",
    skills: job.skills.map((s) => s.name),
    workArrangement: LOCATION_TYPE_MAP[job.locationType] ?? "remote",
    location: {
      city: job.city ?? undefined,
      state: job.state ?? undefined,
      campusId: job.campus?.id,
      remote: job.locationType === "REMOTE",
    },
    budget: {
      type: BUDGET_TYPE_MAP[job.budgetType] ?? "project",
      min: job.budgetMin ?? undefined,
      max: job.budgetMax ?? undefined,
      currency: "NGN",
    },
    duration: "long_term",
    experienceLevel: job.experienceLevel?.toLowerCase() ?? "",
    postedAt: job.publishedAt ?? job.createdAt,
    deadline: job.applicationDeadline ?? "",
    status: STATUS_MAP[job.status.toUpperCase()] ?? "open",
    employer: {
      id: job.employer?.id ?? job.employerId,
      name: job.employer?.displayName ?? "",
      descriptor: "",
      location: job.city ?? "",
      verified: false,
    },
    employerUserId: job.employer?.userId,
    screeningQuestions: [],
    attachments: [],
    viewCount: 0,
    proposalCount: job.proposalCount ?? 0,
  };
}

export function jobListFiltersToQuery(filters: {
  search?: string;
  categoryId?: string;
  experience?: string;
  arrangement?: string;
  sort?: string;
  page?: number;
  size?: number;
}): JobBrowseQuery {
  return {
    page: filters.page,
    limit: filters.size,
    q: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
    experienceLevel: filters.experience
      ? EXPERIENCE_FILTER_TO_BACKEND[filters.experience]
      : undefined,
    locationType: filters.arrangement
      ? ARRANGEMENT_FILTER_TO_BACKEND[filters.arrangement]
      : undefined,
    sort: filters.sort && SUPPORTED_SORTS.has(filters.sort) ? filters.sort : undefined,
  };
}
