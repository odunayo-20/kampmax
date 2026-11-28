// ============================================================
// EMPLOYER HIRING INSIGHTS
// ============================================================
//
// Where people stand across an employer's open postings, and how the employer
// treats the people who apply. Both come from `GET /employers/me/dashboard`
// (the backend works them out; nothing here is computed from a guess).
//
// A failure here never breaks the dashboard: the snapshot just stays empty.

import { apiClient } from "@/lib/api-client";
import { countOf, replyFacts } from "@/lib/reading";
import { pluralize } from "@/lib/utils";
import { watchFrom, type WatchedPosting } from "@/lib/employer-hub";

export interface HiringPipeline {
  /** Waiting for a decision: not yet looked at, or looked at and left. */
  new: number;
  shortlisted: number;
  interviewing: number;
  hired: number;
}

export interface EmployerReputation {
  received: number;
  /** 0-100, or null while too few people have applied to say. */
  responseRate: number | null;
  /** Hours to a first reaction, or null while too few to say. */
  typicalReplyHours: number | null;
  hires: number;
}

export interface NextInterview {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  /** ISO time. */
  at: string;
  /** Whether the applicant has said yes yet. A time they turned down is not "next": it needs a new one. */
  response: "PROPOSED" | "CONFIRMED";
  name: string;
}

export interface InterviewSummary {
  /** Interviews still ahead that the applicant has not turned down. */
  upcoming: number;
  next: NextInterview | null;
}

export const NO_INTERVIEWS: InterviewSummary = { upcoming: 0, next: null };

export interface EmployerInsights {
  pipeline: HiringPipeline;
  reputation: EmployerReputation | null;
  interviews: InterviewSummary;
  /** Open postings worth a look first (people waiting, or closing soon). */
  watch: WatchedPosting[];
}

/** The interview summary the server sent, or "none" when it sent nothing usable. */
export function interviewsFrom(raw: unknown): InterviewSummary {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = (r.next && typeof r.next === "object" ? r.next : null) as Record<string, unknown> | null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  if (!n || !str(n.applicationId) || !str(n.jobId) || Number.isNaN(Date.parse(str(n.at)))) {
    return NO_INTERVIEWS;
  }
  return {
    upcoming: Math.max(1, countOf(r.upcoming)),
    next: {
      applicationId: str(n.applicationId),
      jobId: str(n.jobId),
      jobTitle: str(n.jobTitle),
      at: str(n.at),
      response: n.response === "CONFIRMED" ? "CONFIRMED" : "PROPOSED",
      name: str(n.name).trim() || "a candidate",
    },
  };
}

export function pipelineFrom(raw: Partial<HiringPipeline> | null | undefined): HiringPipeline {
  return {
    new: countOf(raw?.new),
    shortlisted: countOf(raw?.shortlisted),
    interviewing: countOf(raw?.interviewing),
    hired: countOf(raw?.hired),
  };
}

/** A reputation the server sent, or null when it sent none or nonsense. */
export function reputationFrom(
  raw: Partial<EmployerReputation> | null | undefined
): EmployerReputation | null {
  if (!raw || typeof raw !== "object") return null;
  const rate =
    typeof raw.responseRate === "number" && Number.isFinite(raw.responseRate)
      ? Math.min(100, Math.max(0, Math.round(raw.responseRate)))
      : null;
  const hours =
    typeof raw.typicalReplyHours === "number" &&
    Number.isFinite(raw.typicalReplyHours) &&
    raw.typicalReplyHours >= 0
      ? Math.round(raw.typicalReplyHours)
      : null;
  return {
    received: countOf(raw.received),
    responseRate: rate,
    typicalReplyHours: hours,
    hires: countOf(raw.hires),
  };
}

/** The short facts candidates see, strongest first. A fact with too few people behind it is left out. */
export function reputationChips(rep: EmployerReputation | null): string[] {
  if (!rep) return [];
  const out = replyFacts({ typicalReplyHours: rep.typicalReplyHours, rate: rep.responseRate });
  if (rep.hires > 0) out.push(`${pluralize(rep.hires, "person", "people")} hired`);
  return out;
}

/** What to tell the employer while there is nothing to show yet. Null once candidates can see something. */
export function reputationHint(rep: EmployerReputation | null): string | null {
  if (reputationChips(rep).length > 0) return null;
  return "Your reply speed shows here once a few people have applied. Answer quickly and candidates will see it.";
}

/** GET /employers/me/dashboard, the hiring numbers only. Never throws: no numbers is a valid answer. */
export async function getEmployerInsightsApi(): Promise<EmployerInsights> {
  const { data, error } = await apiClient.get<{
    pipeline?: Partial<HiringPipeline>;
    interviews?: unknown;
    watch?: unknown;
    profile?: { reputation?: Partial<EmployerReputation> | null };
  }>("/employers/me/dashboard");
  if (error || !data) {
    return { pipeline: pipelineFrom(null), reputation: null, interviews: NO_INTERVIEWS, watch: [] };
  }
  return {
    pipeline: pipelineFrom(data.pipeline),
    reputation: reputationFrom(data.profile?.reputation),
    interviews: interviewsFrom(data.interviews),
    watch: watchFrom(data.watch),
  };
}
