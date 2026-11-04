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
import type {
  Job,
  JobBrowseQuery,
  JobOpportunityType,
  JobPayPeriod,
  JobStatus,
  CreateJobDto,
  UpdateJobDto,
} from "@/services/jobs";
import type {
  Opportunity,
  OpportunityBudgetType,
  OpportunityDuration,
  OpportunityHiring,
  OpportunityInput,
  OpportunityPayPeriod,
  OpportunityStatus,
  OpportunityType,
  OpportunityWorkArrangement,
} from "@/types/opportunity";
import { isHiringType } from "@/types/opportunity";
import { DURATION_LABEL } from "@/config/opportunity";

// ── Opportunity type / pay period ───────────────────────────

const TYPE_FROM_BACKEND: Record<JobOpportunityType, OpportunityType> = {
  GIG: "gig",
  FULL_TIME: "full_time",
  PART_TIME: "part_time",
  INTERNSHIP: "internship",
  CONTRACT: "contract",
};

const TYPE_TO_BACKEND: Record<OpportunityType, JobOpportunityType> = {
  gig: "GIG",
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  internship: "INTERNSHIP",
  contract: "CONTRACT",
};

const PAY_PERIOD_FROM_BACKEND: Record<JobPayPeriod, OpportunityPayPeriod> = {
  HOURLY: "hourly",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

const PAY_PERIOD_TO_BACKEND: Record<OpportunityPayPeriod, JobPayPeriod> = {
  hourly: "HOURLY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

/** The hiring fields a gig (or an input that never set them) carries. */
export function defaultHiring(): OpportunityHiring {
  return { isPaid: true, openings: 1, eligibility: "", offersCertificate: false };
}

/** UI type tab -> the backend type to request (undefined = no filter). */
export function opportunityTypeToBackend(
  type: OpportunityType | "all" | undefined
): JobOpportunityType | undefined {
  return type && type !== "all" ? TYPE_TO_BACKEND[type] : undefined;
}

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
    opportunityType: TYPE_FROM_BACKEND[job.opportunityType ?? "GIG"] ?? "gig",
    hiring: {
      isPaid: job.isPaid ?? true,
      payPeriod: job.payPeriod ? PAY_PERIOD_FROM_BACKEND[job.payPeriod] : undefined,
      startDate: job.startDate ? job.startDate.slice(0, 10) : undefined,
      durationMonths: job.durationMonths ?? undefined,
      openings: job.openings ?? 1,
      eligibility: job.eligibility ?? "",
      offersCertificate: job.offersCertificate ?? false,
    },
    expiresAt: job.expiresAt ?? "",
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
  const type = input.opportunityType;
  const hiringPost = !!type && isHiringType(type);
  const hiring = hiringPost ? (input.hiring ?? defaultHiring()) : undefined;
  // An unpaid role carries no pay range; a hiring pay range is not hourly/fixed.
  const quotesPay = !hiring || hiring.isPaid;
  return {
    title: input.title.trim(),
    description: input.description.trim() || undefined,
    summary: input.summary.trim() || undefined,
    requirements: input.requirements.trim() || undefined,
    categoryId: input.categoryId || undefined,
    campusId: input.location.campusId && isBackendId(input.location.campusId)
      ? input.location.campusId
      : undefined,
    opportunityType: type ? TYPE_TO_BACKEND[type] : undefined,
    isPaid: hiring?.isPaid,
    payPeriod: hiring?.isPaid && hiring.payPeriod ? PAY_PERIOD_TO_BACKEND[hiring.payPeriod] : undefined,
    startDate: hiring?.startDate || undefined,
    durationMonths: hiring?.durationMonths,
    openings: hiring?.openings,
    eligibility: hiring?.eligibility.trim() || undefined,
    offersCertificate: hiring?.offersCertificate,
    budgetType: hiring ? "FIXED" : input.budget.type === "hourly" ? "HOURLY" : "FIXED",
    budgetMin: quotesPay ? input.budget.min : undefined,
    budgetMax: quotesPay ? input.budget.max : undefined,
    currency: input.budget.currency,
    experienceLevel: EXPERIENCE_TO_BACKEND[input.experienceLevel],
    // A hiring posting states its length in months, not as a bucketed duration.
    estimatedDuration: hiring ? undefined : durationToText(input.duration),
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
    payPeriod: dto.payPeriod ?? null,
    startDate: dto.startDate ?? null,
    durationMonths: dto.durationMonths ?? null,
    eligibility: dto.eligibility ?? null,
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
  type?: OpportunityType;
  sort?: string;
  page?: number;
  size?: number;
}): JobBrowseQuery {
  return {
    page: filters.page,
    limit: filters.size,
    search: filters.search || undefined,
    opportunityType: filters.type ? TYPE_TO_BACKEND[filters.type] : undefined,
    categoryId: filters.categoryId || undefined,
    campusId: filters.campusId && isBackendId(filters.campusId) ? filters.campusId : undefined,
    experienceLevel: filters.experience
      ? EXPERIENCE_TO_BACKEND[filters.experience]
      : undefined,
    locationType: filters.arrangement ? ARRANGEMENT_TO_BACKEND[filters.arrangement] : undefined,
    sort: filters.sort && SUPPORTED_SORTS.has(filters.sort) ? filters.sort : undefined,
  };
}
