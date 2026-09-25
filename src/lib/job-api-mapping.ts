/**
 * The single translation layer between the backend Job resource
 * (services/jobs.ts) and the frontend Opportunity view model
 * (types/opportunity.ts), in both directions:
 *
 *   jobToOpportunity          Job              -> Opportunity   (reads)
 *   opportunityInputToJobDto  OpportunityInput -> Create/UpdateJobDto (writes)
 *   jobListFiltersToQuery     UI filters       -> GET /jobs query
 *
 * The two vocabularies differ (lowercase UI keys vs backend enums, a free-text
 * duration vs bucketed keys, ...), so every mapping is explicit here rather
 * than cast. Fields the backend does not store (a separate "summary", the
 * employer descriptor/verified flag, view counts) are derived or left empty,
 * never invented.
 */
import type { Job, JobBrowseQuery, JobStatus, CreateJobDto, UpdateJobDto } from "@/services/jobs";
import type {
  Opportunity,
  OpportunityBudgetType,
  OpportunityDuration,
  OpportunityInput,
  OpportunityStatus,
  OpportunityWorkArrangement,
} from "@/types/opportunity";
import { DURATION_LABEL } from "@/config/opportunity";

// ── Status ──────────────────────────────────────────────────

const STATUS_FROM_BACKEND: Record<string, OpportunityStatus> = {
  DRAFT: "draft",
  PUBLISHED: "open",
  PAUSED: "closed",
  CLOSED: "closed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

const STATUSES_TO_BACKEND: Partial<Record<OpportunityStatus, JobStatus[]>> = {
  draft: ["DRAFT"],
  open: ["PUBLISHED"],
  closed: ["PAUSED", "CLOSED"],
  cancelled: ["CANCELLED"],
  expired: ["EXPIRED"],
};

/** UI status tab -> backend statuses to request (empty = no filter). */
export function opportunityStatusToBackend(
  status: OpportunityStatus | "all" | undefined
): JobStatus[] {
  return status && status !== "all" ? STATUSES_TO_BACKEND[status] ?? [] : [];
}

// ── Budget / arrangement / experience ───────────────────────

const BUDGET_FROM_BACKEND: Record<string, OpportunityBudgetType> = {
  FIXED: "project",
  HOURLY: "hourly",
};

const ARRANGEMENT_FROM_BACKEND: Record<string, OpportunityWorkArrangement> = {
  REMOTE: "remote",
  ONSITE: "on_site",
  HYBRID: "hybrid",
};

const ARRANGEMENT_TO_BACKEND: Record<string, NonNullable<CreateJobDto["locationType"]>> = {
  remote: "REMOTE",
  on_site: "ONSITE",
  on_campus: "ONSITE",
  hybrid: "HYBRID",
};

const EXPERIENCE_FROM_BACKEND: Record<string, string> = {
  JUNIOR: "entry_level",
  MIDLEVEL: "intermediate",
  SENIOR: "experienced",
  EXPERT: "expert",
};

const EXPERIENCE_TO_BACKEND: Record<string, NonNullable<CreateJobDto["experienceLevel"]>> = {
  entry_level: "JUNIOR",
  beginner: "JUNIOR",
  junior: "JUNIOR",
  intermediate: "MIDLEVEL",
  midlevel: "MIDLEVEL",
  experienced: "SENIOR",
  senior: "SENIOR",
  expert: "EXPERT",
};

// ── Duration (free text on the backend, bucketed in the UI) ──

const DURATION_KEYS = Object.keys(DURATION_LABEL) as OpportunityDuration[];

function durationToText(duration: OpportunityDuration): string {
  return DURATION_LABEL[duration];
}

function durationFromText(text: string | null): OpportunityDuration {
  if (!text) return "short_term";
  const exact = DURATION_KEYS.find((k) => DURATION_LABEL[k] === text);
  if (exact) return exact;

  const t = text.toLowerCase();
  if (/(ongoing|long|3\+|year|6\s*month)/.test(t)) return "long_term";
  if (/month/.test(t)) return "one_to_three_months";
  if (/week/.test(t)) return "few_weeks";
  return "short_term";
}

// ── Identifiers ─────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Real backend records use UUIDs; legacy demo records use short ids like "j1". */
export function isBackendId(id: string): boolean {
  return UUID_RE.test(id);
}

// ── Read: Job -> Opportunity ────────────────────────────────

export function jobToOpportunity(job: Job): Opportunity {
  const description = job.description ?? "";
  const workArrangement = ARRANGEMENT_FROM_BACKEND[job.locationType] ?? "on_site";

  return {
    id: job.id,
    title: job.title,
    categoryId: job.category?.id ?? "",
    categoryName: job.category?.name,
    summary: job.summary ?? (description.length > 160 ? `${description.slice(0, 157)}...` : description),
    description,
    requirements: job.requirements ?? "",
    skills: (job.skills ?? []).map((s) => s.name),
    workArrangement,
    location: {
      city: job.city ?? undefined,
      state: job.state ?? undefined,
      campusId: job.campus?.id,
      remote: workArrangement === "remote",
    },
    budget: {
      type: BUDGET_FROM_BACKEND[job.budgetType] ?? "project",
      // Postgres NUMERIC can arrive as a string.
      min: job.budgetMin != null ? Number(job.budgetMin) : undefined,
      max: job.budgetMax != null ? Number(job.budgetMax) : undefined,
      currency: "NGN",
    },
    duration: durationFromText(job.estimatedDuration),
    experienceLevel: EXPERIENCE_FROM_BACKEND[job.experienceLevel ?? ""] ?? "",
    postedAt: job.publishedAt ?? job.createdAt,
    deadline: job.applicationDeadline ? job.applicationDeadline.slice(0, 10) : "",
    status: STATUS_FROM_BACKEND[String(job.status).toUpperCase()] ?? "draft",
    employer: {
      id: job.employer?.id ?? job.employerId,
      name: job.employer?.displayName ?? "",
      descriptor: "",
      location: [job.city, job.state].filter(Boolean).join(", "),
      verified: false,
    },
    employerUserId: job.employer?.userId,
    screeningQuestions: (job.screeningQuestions ?? []).map((q) => ({
      id: q.id,
      question: q.question,
      optional: q.optional,
    })),
    attachments: (job.attachments ?? []).map((a) => ({
      id: a.id,
      filename: a.filename,
      sizeBytes: a.sizeBytes,
      mimeType: a.mimeType,
    })),
    viewCount: 0,
    proposalCount: job.proposalCount ?? 0,
  };
}

// ── Write: OpportunityInput -> job DTO ──────────────────────

/** A date-only deadline means "until the end of that day". */
function deadlineToIso(deadline: string): string | undefined {
  const d = deadline.trim();
  if (!d) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T23:59:59.000Z` : new Date(d).toISOString();
}

/**
 * The write mapping. Ids the backend didn't mint (e.g. local "sq1" question
 * ids) are dropped so it assigns real ones; the campus is only sent when it is
 * a real campus id. `mediaIds` are attachments already uploaded via the media
 * service.
 */
export function opportunityInputToJobDto(
  input: OpportunityInput,
  mediaIds?: string[]
): CreateJobDto {
  return {
    title: input.title.trim(),
    description: input.description.trim() || undefined,
    summary: input.summary.trim() || undefined,
    requirements: input.requirements.trim() || undefined,
    categoryId: input.categoryId || undefined,
    campusId: input.location.campusId && isBackendId(input.location.campusId)
      ? input.location.campusId
      : undefined,
    budgetType: input.budget.type === "hourly" ? "HOURLY" : "FIXED",
    budgetMin: input.budget.min,
    budgetMax: input.budget.max,
    currency: input.budget.currency,
    experienceLevel: EXPERIENCE_TO_BACKEND[input.experienceLevel],
    estimatedDuration: durationToText(input.duration),
    locationType: ARRANGEMENT_TO_BACKEND[input.workArrangement] ?? "ONSITE",
    state: input.location.state?.trim() || undefined,
    city: input.location.city?.trim() || undefined,
    applicationDeadline: deadlineToIso(input.deadline),
    skills: input.skills,
    screeningQuestions: input.screeningQuestions.map((q) => ({
      id: isBackendId(q.id) ? q.id : undefined,
      question: q.question,
      optional: q.optional,
    })),
    mediaIds: mediaIds ?? input.attachments?.map((a) => a.id),
  };
}

/**
 * PATCH body: like the create DTO, but fields the user cleared are sent as
 * null so they actually clear (an omitted field means "unchanged").
 */
export function opportunityInputToUpdateDto(
  input: OpportunityInput,
  mediaIds?: string[]
): UpdateJobDto {
  const dto = opportunityInputToJobDto(input, mediaIds);
  return {
    ...dto,
    description: dto.description ?? null,
    summary: dto.summary ?? null,
    requirements: dto.requirements ?? null,
    categoryId: dto.categoryId ?? null,
    budgetMin: dto.budgetMin ?? null,
    budgetMax: dto.budgetMax ?? null,
    experienceLevel: dto.experienceLevel ?? null,
    city: dto.city ?? null,
    state: dto.state ?? null,
    applicationDeadline: dto.applicationDeadline ?? null,
  };
}

// ── Query: UI filters -> GET /jobs ──────────────────────────

const SUPPORTED_SORTS = new Set(["newest", "oldest", "deadline"]);

export function jobListFiltersToQuery(filters: {
  search?: string;
  categoryId?: string;
  campusId?: string;
  experience?: string;
  arrangement?: string;
  sort?: string;
  page?: number;
  size?: number;
}): JobBrowseQuery {
  return {
    page: filters.page,
    limit: filters.size,
    search: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
    campusId: filters.campusId && isBackendId(filters.campusId) ? filters.campusId : undefined,
    experienceLevel: filters.experience
      ? EXPERIENCE_TO_BACKEND[filters.experience]
      : undefined,
    locationType: filters.arrangement ? ARRANGEMENT_TO_BACKEND[filters.arrangement] : undefined,
    sort: filters.sort && SUPPORTED_SORTS.has(filters.sort) ? filters.sort : undefined,
  };
}
