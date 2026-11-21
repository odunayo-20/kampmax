// ============================================================
// EMPLOYER PEOPLE (one list for everyone who responded)
// ============================================================
//
// CV applicants to vacancies and internships and freelancers' proposals on
// gigs, on the same five stages. `GET /employers/me/people`. The backend does
// the merging and counting; this reads the answer safely and says what can be
// done to a person without leaving the list. Hiring an applicant (it fills an
// opening) and accepting a proposal (it makes a contract) happen on the
// posting's own screen, so they are not offered here.

import { apiClient } from "@/lib/api-client";
import { countOf } from "@/lib/reading";
import type { ApiError } from "@/lib/api-client";

export const PEOPLE_STAGES = ["NEW", "SHORTLISTED", "INTERVIEWING", "HIRED", "DECLINED"] as const;
export type PeopleStage = (typeof PEOPLE_STAGES)[number];

export const STAGE_LABEL: Record<PeopleStage, string> = {
  NEW: "New",
  SHORTLISTED: "Shortlisted",
  INTERVIEWING: "Interviewing",
  HIRED: "Hired",
  DECLINED: "Not selected",
};

export const STAGE_EMPTY: Record<PeopleStage, string> = {
  NEW: "Nobody is waiting for you. New applicants and proposals show up here.",
  SHORTLISTED: "Nobody is shortlisted yet. Shortlist the people you want to look at again.",
  INTERVIEWING: "Nobody is at the interview stage. Invite a shortlisted person to talk.",
  HIRED: "Nobody is hired yet.",
  DECLINED: "Nobody has been turned down.",
};

/** The address of the People list, optionally opened on one stage. */
export function peopleHref(stage?: PeopleStage): string {
  return stage ? `/employer/people?stage=${stage}` : "/employer/people";
}

/**
 * The stage an old applications-page link meant. Links and bookmarks to `/employer/applications?status=…` still
 * work: they land on the stage that status belongs to. A status with no stage (withdrawn) opens the list as it is.
 */
export function stageForOldStatus(status: string | null | undefined): PeopleStage | undefined {
  switch (String(status ?? "").toLowerCase()) {
    case "submitted":
    case "under_review":
      return "NEW";
    case "shortlisted":
      return "SHORTLISTED";
    case "accepted":
      return "HIRED";
    case "rejected":
      return "DECLINED";
    default:
      return undefined;
  }
}

export type PersonKind = "APPLICATION" | "PROPOSAL";

export interface Person {
  kind: PersonKind;
  /** The application or proposal a decision is made on. */
  id: string;
  jobId: string;
  jobTitle: string;
  opportunityType: string;
  stage: PeopleStage;
  status: string;
  person: { id: string; name: string; avatar: string | null };
  cvLabel: string | null;
  amount: number | null;
  currency: string | null;
  sentAt: string | null;
}

export type PeopleCounts = Record<PeopleStage | "ALL", number>;

export interface PeoplePage {
  items: Person[];
  counts: PeopleCounts;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PeopleQuery {
  stage: PeopleStage;
  page: number;
  sort: "newest" | "oldest";
  search?: string;
  jobId?: string;
}

export const PEOPLE_PAGE_SIZE = 20;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const isStage = (v: unknown): v is PeopleStage => PEOPLE_STAGES.includes(v as PeopleStage);

export const EMPTY_COUNTS: PeopleCounts = {
  ALL: 0,
  NEW: 0,
  SHORTLISTED: 0,
  INTERVIEWING: 0,
  HIRED: 0,
  DECLINED: 0,
};

export function countsFrom(raw: Partial<Record<keyof PeopleCounts, unknown>> | null | undefined): PeopleCounts {
  return {
    ALL: countOf(raw?.ALL),
    NEW: countOf(raw?.NEW),
    SHORTLISTED: countOf(raw?.SHORTLISTED),
    INTERVIEWING: countOf(raw?.INTERVIEWING),
    HIRED: countOf(raw?.HIRED),
    DECLINED: countOf(raw?.DECLINED),
  };
}

/** One person as the server sent them, or null when the row is too broken to show. */
export function personFrom(raw: unknown): Person | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const who = (r.person && typeof r.person === "object" ? r.person : {}) as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id || typeof r.jobId !== "string" || !r.jobId) return null;
  return {
    kind: r.kind === "PROPOSAL" ? "PROPOSAL" : "APPLICATION",
    id: r.id,
    jobId: r.jobId,
    jobTitle: str(r.jobTitle),
    opportunityType: str(r.opportunityType) || "GIG",
    stage: isStage(r.stage) ? r.stage : "NEW",
    status: str(r.status),
    person: { id: str(who.id), name: str(who.name).trim() || "Candidate", avatar: str(who.avatar) || null },
    cvLabel: str(r.cvLabel) || null,
    amount: typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : null,
    currency: str(r.currency) || null,
    sentAt: str(r.sentAt) || null,
  };
}

/** Opens on the people who need a look, then whoever is furthest along. */
export function defaultStage(counts: PeopleCounts): PeopleStage {
  return PEOPLE_STAGES.find((s) => counts[s] > 0) ?? "NEW";
}

export type PersonAction = "shortlist" | "interview" | "decline";

/** What can be done to someone here. A proposal has no interview stage; a decision is final. */
export function personActions(p: Pick<Person, "kind" | "stage">): PersonAction[] {
  if (p.stage === "NEW") {
    return p.kind === "APPLICATION" ? ["shortlist", "interview", "decline"] : ["shortlist", "decline"];
  }
  if (p.stage === "SHORTLISTED") return p.kind === "APPLICATION" ? ["interview", "decline"] : ["decline"];
  if (p.stage === "INTERVIEWING") return ["decline"];
  return [];
}

/** Where hiring or accepting is done for this kind of person. */
export function reviewHref(p: Pick<Person, "kind" | "id" | "jobId">): string {
  return p.kind === "APPLICATION"
    ? `/employer/jobs/${p.jobId}/applications`
    : `/employer/applications/${p.id}`;
}

/** What the person offered: a CV for an application, a quote for a proposal. */
export function offerLine(
  p: Pick<Person, "cvLabel" | "amount" | "currency">,
  formatMoney: (n: number) => string
): string {
  if (p.amount !== null) {
    return p.currency && p.currency !== "NGN" ? `${p.amount} ${p.currency}` : formatMoney(p.amount);
  }
  return p.cvLabel ? `CV: ${p.cvLabel}` : "";
}

export async function listEmployerPeopleApi(
  q: PeopleQuery
): Promise<{ page: PeoplePage | null; error: ApiError | null }> {
  const params = new URLSearchParams({
    stage: q.stage,
    page: String(q.page),
    limit: String(PEOPLE_PAGE_SIZE),
    sort: q.sort,
  });
  if (q.search?.trim()) params.set("search", q.search.trim().slice(0, 80));
  if (q.jobId) params.set("jobId", q.jobId);
  const { data, error } = await apiClient.get<{
    items?: unknown[];
    counts?: Partial<Record<keyof PeopleCounts, unknown>>;
    meta?: Partial<PeoplePage["meta"]>;
  }>(`/employers/me/people?${params.toString()}`);
  if (error || !data) return { page: null, error };
  return {
    error: null,
    page: {
      items: (data.items ?? []).map(personFrom).filter((p): p is Person => p !== null),
      counts: countsFrom(data.counts),
      meta: {
        total: countOf(data.meta?.total),
        page: countOf(data.meta?.page) || q.page,
        limit: countOf(data.meta?.limit) || PEOPLE_PAGE_SIZE,
        totalPages: Math.max(1, countOf(data.meta?.totalPages)),
      },
    },
  };
}
