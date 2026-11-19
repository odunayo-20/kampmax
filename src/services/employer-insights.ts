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

export interface EmployerInsights {
  pipeline: HiringPipeline;
  reputation: EmployerReputation | null;
}

const count = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;

export function pipelineFrom(raw: Partial<HiringPipeline> | null | undefined): HiringPipeline {
  return {
    new: count(raw?.new),
    shortlisted: count(raw?.shortlisted),
    interviewing: count(raw?.interviewing),
    hired: count(raw?.hired),
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
    received: count(raw.received),
    responseRate: rate,
    typicalReplyHours: hours,
    hires: count(raw.hires),
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "within an hour", "within 5 hours", "in about 2 days". */
export function replyTimeText(hours: number): string {
  if (hours <= 1) return "within an hour";
  if (hours < 24) return `within ${hours} hours`;
  return `in about ${plural(Math.round(hours / 24), "day")}`;
}

/** The short facts candidates see, strongest first. A fact with too few people behind it is left out. */
export function reputationChips(rep: EmployerReputation | null): string[] {
  if (!rep) return [];
  const out: string[] = [];
  if (rep.typicalReplyHours !== null) out.push(`Replies ${replyTimeText(rep.typicalReplyHours)}`);
  if (rep.responseRate !== null) out.push(`${rep.responseRate}% answered`);
  if (rep.hires > 0) out.push(`${plural(rep.hires, "person", "people")} hired`);
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
    profile?: { reputation?: Partial<EmployerReputation> | null };
  }>("/employers/me/dashboard");
  if (error || !data) return { pipeline: pipelineFrom(null), reputation: null };
  return {
    pipeline: pipelineFrom(data.pipeline),
    reputation: reputationFrom(data.profile?.reputation),
  };
}
